const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');

const collections = ['tripEntries', 'vehicles', 'parties', 'customers', 'drivers', 'fromcustomers'];

async function main() {
  const environment = await initializeTestEnvironment({
    projectId: 'demo-triptrack',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
    },
  });

  try {
    await environment.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'staff', 'approved-user'), { active: true });
      await setDoc(doc(context.firestore(), 'staff', 'inactive-user'), { active: false });
    });

    const approved = environment.authenticatedContext('approved-user').firestore();
    const unknown = environment.authenticatedContext('unknown-user').firestore();
    const inactive = environment.authenticatedContext('inactive-user').firestore();
    const guest = environment.unauthenticatedContext().firestore();

    for (const collectionName of collections) {
      await assertSucceeds(setDoc(doc(approved, collectionName, 'example'), { checked: true }));
      const snapshot = await assertSucceeds(getDoc(doc(approved, collectionName, 'example')));
      assert.equal(snapshot.data().checked, true);
      await assertFails(getDoc(doc(guest, collectionName, 'example')));
      await assertFails(getDoc(doc(unknown, collectionName, 'example')));
      await assertFails(setDoc(doc(unknown, collectionName, 'blocked'), { checked: false }));
      await assertFails(getDoc(doc(inactive, collectionName, 'example')));
    }

    await assertFails(setDoc(doc(approved, 'staff', 'approved-user'), { active: true }));
    assert.equal((await assertSucceeds(getDoc(doc(approved, 'staff', 'approved-user')))).data().active, true);
    assert.equal((await assertSucceeds(getDoc(doc(unknown, 'staff', 'unknown-user')))).exists(), false);
    await assertFails(getDoc(doc(unknown, 'staff', 'approved-user')));
    await assertFails(setDoc(doc(approved, 'unlisted', 'example'), { checked: true }));
    console.log('Firestore rules passed: six collections, approved staff, guests, unknown users, inactive users, and staff edits.');
  } finally {
    await environment.cleanup();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
