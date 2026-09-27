const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
if (!backup) throw new Error('Usage: node scripts/verify-firestore-queries.cjs <post-migration-backup-directory>');
const docs = JSON.parse(fs.readFileSync(path.join(backup, 'tripEntries.json'), 'utf8'));
const vehicle = docs[0]?.fields?.vehicleKey?.stringValue;
const party = docs[0]?.fields?.partyKeys?.arrayValue?.values?.[0]?.stringValue;
if (!vehicle || !party) throw new Error('Backup has no derived trip lookup fields.');
const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();
const endpoint = 'https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:runQuery';
const check = async (field, op, value, expected) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'tripEntries' }],
      where: { fieldFilter: { field: { fieldPath: field }, op, value: { stringValue: value } } },
    } }),
  });
  if (!response.ok) throw new Error(`${field} query failed: ${response.status} ${await response.text()}`);
  const results = await response.json();
  const actual = results.filter(result => result.document).length;
  if (actual !== expected) throw new Error(`${field} query returned ${actual} trips; expected ${expected}.`);
  console.log(`${field} query verified: ${actual} matching trips.`);
};
(async () => {
  await check('vehicleKey', 'EQUAL', vehicle, docs.filter(doc => doc.fields?.vehicleKey?.stringValue === vehicle).length);
  await check('partyKeys', 'ARRAY_CONTAINS', party, docs.filter(doc => (doc.fields?.partyKeys?.arrayValue?.values || []).some(value => value.stringValue === party)).length);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
