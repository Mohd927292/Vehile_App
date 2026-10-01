const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
const apply = process.argv.includes('--apply');
if (!backup) throw new Error('Usage: node scripts/backfill-party-months.cjs <backup-directory> [--apply]');
const read = name => JSON.parse(fs.readFileSync(path.join(backup, `${name}.json`), 'utf8'));
const parties = read('parties');
const trips = read('tripEntries');
const monthsByParty = new Map();
const monthForTrip = trip => {
  const raw = trip.fields?.date?.stringValue || '';
  const iso = raw.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const dayFirst = raw.match(/^\d{2}[-/](\d{2})[-/](\d{4})$/);
  if (dayFirst) return `${dayFirst[2]}-${dayFirst[1]}`;
  throw new Error(`Trip lacks a valid date: ${trip.name}`);
};
for (const trip of trips) {
  const month = monthForTrip(trip);
  for (const location of trip.fields?.locations?.arrayValue?.values || []) {
    const id = location.mapValue?.fields?.partyId?.stringValue;
    if (!id) throw new Error(`Trip route lacks party ID: ${trip.name}`);
    const counts = monthsByParty.get(id) || new Map();
    counts.set(month, (counts.get(month) || 0) + 1);
    monthsByParty.set(id, counts);
  }
}
const writes = parties.map(party => {
  const id = party.name.split('/').pop();
  const counts = monthsByParty.get(id) || new Map();
  const values = Object.fromEntries([...counts].map(([month, count]) => [month, { integerValue: String(count) }]));
  return {
    update: { name: party.name, fields: { monthCounts: { mapValue: { fields: values } } } },
    updateMask: { fieldPaths: ['monthCounts'] },
    currentDocument: { updateTime: party.updateTime },
  };
}).filter((write, index) => {
  const existing = parties[index].fields?.monthCounts?.mapValue?.fields || {};
  const expected = write.update.fields.monthCounts.mapValue.fields;
  const existingCounts = Object.fromEntries(Object.entries(existing).map(([month, value]) => [month, Number(value.integerValue ?? value.doubleValue ?? 0)]));
  const expectedCounts = Object.fromEntries(Object.entries(expected).map(([month, value]) => [month, Number(value.integerValue)]));
  return Object.keys(existingCounts).length !== Object.keys(expectedCounts).length ||
    Object.entries(expectedCounts).some(([month, count]) => existingCounts[month] !== count);
});
console.log(`${writes.length} party summaries need monthly counts.`);
if (!apply) { console.log('Dry run. Use --apply after reviewing the backup.'); process.exit(0); }
const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();
(async () => {
  const response = await fetch('https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:commit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  });
  if (!response.ok) throw new Error(`Commit failed: ${response.status} ${await response.text()}`);
  console.log(`Updated ${writes.length} party summaries.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
