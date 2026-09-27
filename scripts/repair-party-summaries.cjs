// Reconciles party load counters with trip destinations; leaves customer records untouched.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
const apply = process.argv.includes('--apply');
if (!backup) throw new Error('Usage: node scripts/repair-party-summaries.cjs <backup-directory> [--apply]');
const read = name => JSON.parse(fs.readFileSync(path.join(backup, `${name}.json`), 'utf8'));
const parties = read('parties');
const trips = read('tripEntries');
const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const counts = new Map();
for (const trip of trips) {
  for (const location of trip.fields?.locations?.arrayValue?.values || []) {
    const display = location.mapValue?.fields?.to?.stringValue?.replace(/\s+/g, ' ').trim();
    const key = normalize(display);
    if (!key) continue;
    const current = counts.get(key) || { display, count: 0, latestAt: null };
    current.count++;
    const createdAt = trip.fields?.createdAt?.timestampValue;
    if (createdAt && (!current.latestAt || createdAt > current.latestAt)) current.latestAt = createdAt;
    counts.set(key, current);
  }
}
const existing = new Map(parties.map(party => [normalize(party.fields?.to?.stringValue), party]));
const writes = [];
for (const [key, entry] of counts) {
  const party = existing.get(key);
  if (party) {
    const stored = Number(party.fields?.loadCount?.integerValue ?? party.fields?.loadCount?.doubleValue ?? 0);
    const missingLastTrip = !party.fields?.lastTripAt && entry.latestAt;
    if (stored === entry.count && !missingLastTrip) continue;
    const fields = {
      ...(stored === entry.count ? {} : { loadCount: { integerValue: String(entry.count) } }),
      ...(missingLastTrip ? { lastTripAt: { timestampValue: entry.latestAt } } : {}),
    };
    writes.push({
      update: { name: party.name, fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { updateTime: party.updateTime },
    });
  } else {
    writes.push({
      update: {
        name: `projects/vehicle2-79fd6/databases/(default)/documents/parties/${entry.display}`,
        fields: { to: { stringValue: entry.display }, loadCount: { integerValue: String(entry.count) }, ...(entry.latestAt ? { lastTripAt: { timestampValue: entry.latestAt } } : {}) },
      },
      currentDocument: { exists: false },
    });
  }
}
console.log(`${writes.length} party summaries need repair or creation.`);
if (!apply) { console.log('Dry run. Use --apply after reviewing the backup.'); process.exit(0); }
const token = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim();
(async () => {
  const response = await fetch('https://firestore.googleapis.com/v1/projects/vehicle2-79fd6/databases/(default)/documents:commit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  });
  if (!response.ok) throw new Error(`Commit failed: ${response.status} ${await response.text()}`);
  console.log(`Reconciled ${writes.length} party summaries.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
