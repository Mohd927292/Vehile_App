const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
if (!backup) throw new Error('Usage: node scripts/check-party-page.cjs <backup-directory>');
const trips = JSON.parse(fs.readFileSync(path.join(backup, 'tripEntries.json'), 'utf8'));
const partyId = trips[0]?.fields?.partyIds?.arrayValue?.values?.[0]?.stringValue;
const date = trips[0]?.fields?.date?.stringValue;
const month = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : `${date.slice(6, 10)}-${date.slice(3, 5)}`;
const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();
(async () => {
  const run = async (direction, selectedMonth = null) => {
  const [year, monthNumber] = selectedMonth ? selectedMonth.split('-').map(Number) : [];
  const dateRange = selectedMonth ? [
    { fieldFilter: { field: { fieldPath: 'dateTimestamp' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: new Date(year, monthNumber - 1, 1).toISOString() } } },
    { fieldFilter: { field: { fieldPath: 'dateTimestamp' }, op: 'LESS_THAN', value: { timestampValue: new Date(year, monthNumber, 1).toISOString() } } },
  ] : [];
  const response = await fetch('https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:runQuery', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'tripEntries' }],
      where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'partyIds' }, op: 'ARRAY_CONTAINS', value: { stringValue: partyId } } },
        ...dateRange,
      ] } },
      orderBy: [{ field: { fieldPath: 'dateTimestamp' }, direction }],
      limit: 25,
    } }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Indexed page query failed: ${response.status} ${JSON.stringify(body).slice(0, 1500)}`);
  console.log(`Indexed party page ${selectedMonth || 'all'} ${direction}: ${body.filter(item => item.document).length} rows.`);
  };
  await run('DESCENDING');
  await run('ASCENDING');
  await run('DESCENDING', month);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
