const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
if (!backup) throw new Error('Usage: node scripts/check-trip-pages.cjs <backup-directory>');
const trips = JSON.parse(fs.readFileSync(path.join(backup, 'tripEntries.json'), 'utf8'));
const vehicle = trips[0]?.fields?.vehicleKey?.stringValue;
const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();

const run = async (label, direction, vehicleKey = null) => {
  const structuredQuery = {
    from: [{ collectionId: 'tripEntries' }],
    orderBy: [{ field: { fieldPath: 'dateTimestamp' }, direction }],
    limit: 40,
  };
  if (vehicleKey) structuredQuery.where = { fieldFilter: {
    field: { fieldPath: 'vehicleKey' }, op: 'EQUAL', value: { stringValue: vehicleKey },
  } };
  const response = await fetch('https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:runQuery', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${label}: ${response.status} ${JSON.stringify(body).slice(0, 1200)}`);
  console.log(`${label}: ${body.filter(item => item.document).length} rows`);
};

(async () => {
  await run('All trips newest', 'DESCENDING');
  await run('All trips oldest', 'ASCENDING');
  await run('Vehicle newest', 'DESCENDING', vehicle);
  await run('Vehicle oldest', 'ASCENDING', vehicle);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
