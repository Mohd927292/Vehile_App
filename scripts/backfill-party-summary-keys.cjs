const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const backup = process.argv[2];
const apply = process.argv.includes('--apply');
if (!backup) throw new Error('Usage: node scripts/backfill-party-summary-keys.cjs <backup-directory> [--apply]');
const parties = JSON.parse(fs.readFileSync(path.join(backup, 'parties.json'), 'utf8'));
const keyOf = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const seen = new Set();
const writes = [];
for (const party of parties) {
  const key = keyOf(party.fields?.to?.stringValue);
  if (!key || seen.has(key)) throw new Error(`Missing or duplicate party identity: ${key}`);
  seen.add(key);
  if (party.fields?.partyKey?.stringValue === key) continue;
  writes.push({
    update: { name: party.name, fields: { partyKey: { stringValue: key } } },
    updateMask: { fieldPaths: ['partyKey'] },
    currentDocument: { updateTime: party.updateTime },
  });
}
console.log(`${writes.length} party summaries need normalized identity keys.`);
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
