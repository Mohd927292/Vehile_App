const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const token = execFileSync('gcloud.cmd', ['auth', 'print-access-token'], { encoding: 'utf8', shell: true }).trim();
const project = 'vehicle2-79fd6';
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' };
async function read(url, body) {
  const response = await fetch(url, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(result)}`);
  return result;
}
(async () => {
  const release = await read(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
  const ruleset = await read(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  const deployed = ruleset.source.files.find(file => file.name === 'firestore.rules').content;
  if (deployed.replace(/\r/g, '').trim() !== fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8').replace(/\r/g, '').trim()) throw new Error('Deployed rules differ from source');
  console.log('Deployed rules match source.');
  const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const profiles = await read(root + '/staff');
  const admins = profiles.documents.filter(item => item.fields.role.stringValue === 'admin');
  if (admins.length !== 1 || admins[0].fields.email.stringValue !== '92rnatransport@gmail.com') throw new Error('Admin profile mismatch');
  console.log(`Verified ${profiles.documents.length} profiles and exact admin identity.`);
  const uid = admins[0].name.split('/').pop();
  for (const direction of ['ASCENDING', 'DESCENDING']) {
    for (const key of ['vehicleKey', 'partyIds']) {
      const structuredQuery = { from: [{ collectionId: 'tripEntries' }], where: { fieldFilter: { field: { fieldPath: key }, op: key === 'partyIds' ? 'ARRAY_CONTAINS' : 'EQUAL', value: { stringValue: '__index_check__' } } }, orderBy: [{ field: { fieldPath: 'dateTimestamp' }, direction }], limit: 1 };
      await read(`${root}/workspaces/${uid}:runQuery`, { structuredQuery });
      console.log(`Workspace index ready: ${key}, ${direction}`);
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
