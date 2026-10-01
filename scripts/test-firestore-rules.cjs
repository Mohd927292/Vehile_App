const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
const collections = ['tripEntries', 'vehicles', 'parties', 'customers', 'drivers', 'fromcustomers', 'archivedTrips', 'loads'];

async function main() {
  const environment = await initializeTestEnvironment({ projectId: 'demo-triptrack', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  try {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
      for (const [uid, active, role] of [['alice', true, 'user'], ['bob', true, 'user'], ['admin', true, 'admin'], ['inactive', false, 'user']]) {
        await setDoc(doc(context.firestore(), 'staff', uid), { active, role, email: `${uid}@example.test`, displayName: uid });
      }
      await setDoc(doc(context.firestore(), 'tripEntries', 'legacy'), { preserved: true });
    });
    const alice = environment.authenticatedContext('alice').firestore();
    const bob = environment.authenticatedContext('bob').firestore();
    const admin = environment.authenticatedContext('admin').firestore();
    const guest = environment.unauthenticatedContext().firestore();
    const inactive = environment.authenticatedContext('inactive').firestore();
    for (const name of collections) {
      const parts = ['workspaces', 'alice', name, 'same-id'];
      await assertSucceeds(setDoc(doc(alice, ...parts), { owner: 'alice' }));
      await assertSucceeds(setDoc(doc(bob, 'workspaces', 'bob', name, 'same-id'), { owner: 'bob' }));
      assert.equal((await assertSucceeds(getDoc(doc(alice, ...parts)))).data().owner, 'alice');
      assert.equal((await assertSucceeds(getDoc(doc(admin, ...parts)))).data().owner, 'alice');
      await assertSucceeds(getDocs(collection(admin, 'workspaces', 'bob', name)));
      await assertSucceeds(updateDoc(doc(admin, ...parts), { editedByAdmin: true }));
      await assertFails(getDoc(doc(bob, ...parts)));
      await assertFails(getDocs(collection(bob, 'workspaces', 'alice', name)));
      await assertFails(setDoc(doc(bob, ...parts), { owner: 'bob' }));
      await assertFails(getDoc(doc(guest, ...parts)));
      await assertFails(getDoc(doc(inactive, ...parts)));
      await assertFails(setDoc(doc(alice, name, 'root-write'), { owner: 'alice' }));
      await assertFails(setDoc(doc(admin, name, 'root-write'), { owner: 'admin' }));
    }
    await assertSucceeds(getDoc(doc(admin, 'tripEntries', 'legacy')));
    await assertFails(getDoc(doc(alice, 'tripEntries', 'legacy')));
    await assertSucceeds(getDocs(collection(admin, 'staff')));
    await assertFails(getDocs(collection(alice, 'staff')));
    await assertSucceeds(getDoc(doc(alice, 'staff', 'alice')));
    await assertFails(getDoc(doc(alice, 'staff', 'bob')));
    await assertFails(updateDoc(doc(alice, 'staff', 'alice'), { role: 'admin' }));
    await assertFails(setDoc(doc(admin, 'workspaces', 'missing', 'tripEntries', 'x'), { owner: 'missing' }));
    const newcomer = environment.authenticatedContext('new-user', { email: 'new@example.test' }).firestore();
    const profile = { email: 'new@example.test', displayName: 'New user', role: 'user', active: true, createdAt: serverTimestamp() };
    await assertFails(setDoc(doc(newcomer, 'staff', 'new-user'), { ...profile, role: 'admin' }));
    await assertFails(setDoc(doc(newcomer, 'staff', 'new-user'), { ...profile, email: 'spoof@example.test' }));
    await assertSucceeds(setDoc(doc(newcomer, 'staff', 'new-user'), profile));
    await assertSucceeds(setDoc(doc(newcomer, 'workspaces', 'new-user', 'tripEntries', 'first'), { owner: 'new-user' }));
    await assertFails(setDoc(doc(newcomer, 'workspaces', 'alice', 'tripEntries', 'first'), { owner: 'new-user' }));
    console.log('PASS: isolated reads/writes/queries for eight collections; admin switching; protected legacy records; self-registration and role escalation.');
  } finally { await environment.cleanup(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
