// Backfills only derived lookup fields. Run backup-firestore.ps1 first.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const backup = process.argv[2];
const apply = process.argv.includes('--apply');
if (!backup) throw new Error('Usage: node scripts/backfill-trip-keys.cjs <backup-directory> [--apply]');
const docs = JSON.parse(fs.readFileSync(path.join(backup, 'tripEntries.json'), 'utf8'));
const partyKey = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const vehicleKey = value => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
const fields = doc => doc.fields || {};
const locations = doc => (fields(doc).locations?.arrayValue?.values || []).map(value => ({
  to: value.mapValue?.fields?.to?.stringValue || '',
}));
const writes = docs.map(document => {
  const tripFields = fields(document);
  const key = vehicleKey(tripFields.vehicleNo?.stringValue);
  const keys = [...new Set(locations(document).map(location => partyKey(location.to)).filter(Boolean))];
  if (!key || !keys.length) throw new Error(`Trip has missing lookup data: ${document.name}`);
  return {
    update: {
      name: document.name,
      fields: {
        vehicleKey: { stringValue: key },
        partyKeys: { arrayValue: { values: keys.map(value => ({ stringValue: value })) } },
      },
    },
    updateMask: { fieldPaths: ['vehicleKey', 'partyKeys'] },
    currentDocument: { updateTime: document.updateTime },
  };
}).filter((write, index) => {
  const existing = fields(docs[index]);
  return !existing.vehicleKey || !existing.partyKeys;
});

console.log(`${writes.length} trip records need lookup fields.`);
if (!apply) { console.log('Dry run. Use --apply after reviewing the backup.'); process.exit(0); }

const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();
if (!token) throw new Error('Google Cloud authentication is required.');
const endpoint = 'https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:commit';
(async () => {
  let completed = 0;
  for (let index = 0; index < writes.length; index += 100) {
    const batch = writes.slice(index, index + 100);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: batch }),
    });
    if (!response.ok) throw new Error(`Commit failed at batch ${index / 100 + 1}: ${response.status} ${await response.text()}`);
    completed += batch.length;
    console.log(`Updated ${completed}/${writes.length} trips.`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
