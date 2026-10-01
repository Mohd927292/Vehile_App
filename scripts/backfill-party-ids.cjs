// Adds stable party summary document IDs to existing trip routes.
// Use scripts/backup-firestore.ps1 first; this script is dry-run by default.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
const apply = process.argv.includes('--apply');
if (!backup) throw new Error('Usage: node scripts/backfill-party-ids.cjs <backup-directory> [--apply]');
const read = name => JSON.parse(fs.readFileSync(path.join(backup, `${name}.json`), 'utf8'));
const trips = read('tripEntries');
const parties = read('parties');
const identity = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const partyByName = new Map();
for (const party of parties) {
  const key = identity(party.fields?.to?.stringValue);
  if (!key) continue;
  if (partyByName.has(key)) throw new Error(`Ambiguous party summary name: ${key}`);
  partyByName.set(key, party.name.split('/').pop());
}
const writes = trips.map(trip => {
  const locations = trip.fields?.locations?.arrayValue?.values || [];
  const ids = [];
  const updatedLocations = locations.map(location => {
    const key = identity(location.mapValue?.fields?.to?.stringValue);
    const partyId = partyByName.get(key);
    if (!partyId) throw new Error(`Trip destination lacks a party summary: ${trip.name}`);
    ids.push(partyId);
    return { mapValue: { fields: { ...location.mapValue.fields, partyId: { stringValue: partyId } } } };
  });
  return {
    update: {
      name: trip.name,
      fields: {
        locations: { arrayValue: { values: updatedLocations } },
        partyIds: { arrayValue: { values: [...new Set(ids)].map(id => ({ stringValue: id })) } },
      },
    },
    updateMask: { fieldPaths: ['locations', 'partyIds'] },
    currentDocument: { updateTime: trip.updateTime },
  };
}).filter((write, index) => !trips[index].fields?.partyIds);
console.log(`${writes.length} trips need party IDs; ${partyByName.size} unique party summaries found.`);
if (!apply) { console.log('Dry run. Use --apply after reviewing the backup.'); process.exit(0); }
const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();
(async () => {
  let completed = 0;
  for (let index = 0; index < writes.length; index += 100) {
    const batch = writes.slice(index, index + 100);
    const response = await fetch('https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:commit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: batch }),
    });
    if (!response.ok) throw new Error(`Commit failed at batch ${index / 100 + 1}: ${response.status} ${await response.text()}`);
    completed += batch.length;
    console.log(`Updated ${completed}/${writes.length} trips.`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
