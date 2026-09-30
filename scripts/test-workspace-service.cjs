// Exercise the actual app service against Firestore Emulator using the web SDK adapter.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const firestore = require('firebase/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

async function main() {
  const environment = await initializeTestEnvironment({ projectId: 'demo-triptrack', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  try {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
      for (const uid of ['admin', 'alice', 'bob']) await firestore.setDoc(firestore.doc(context.firestore(), 'staff', uid), { active: true, role: uid === 'admin' ? 'admin' : 'user' });
    });
    const db = environment.authenticatedContext('admin').firestore();
    const cache = new Map();
    const mocks = {
      '@react-native-firebase/firestore': { ...firestore, getFirestore: () => db },
      '@react-native-firebase/app': { getApps: () => [{}], initializeApp: () => {} },
      '@react-native-firebase/auth': { getAuth: () => ({ currentUser: { uid: 'admin' } }) },
    };
    function load(filename) {
      filename = path.resolve(filename);
      if (cache.has(filename)) return cache.get(filename).exports;
      const compiled = new Module(filename, module);
      cache.set(filename, compiled);
      compiled.filename = filename;
      compiled.paths = Module._nodeModulePaths(path.dirname(filename));
      compiled.require = name => {
        if (mocks[name]) return mocks[name];
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.js'));
        return require(name);
      };
      const transformed = babel.transformFileSync(filename, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
      compiled._compile(transformed.code, filename);
      return compiled.exports;
    }
    const root = path.join(__dirname, '..', 'src');
    const scope = load(path.join(root, 'services', 'workspace.js'));
    const { tripService, vehicleTripService } = load(path.join(root, 'config', 'firebase.js'));
    const trip = { vehicleNo: 'MH-12 AB 1234', driverName: 'Driver / Test', date: '30-09-2026', dateTimestamp: firestore.Timestamp.fromDate(new Date(2026, 8, 30)), amount: 250, locations: [{ from: 'Depot / A', to: 'Acme' }, { from: 'Depot / A', to: 'Acme' }, { from: 'Depot B', to: 'Beta' }] };
    scope.activateWorkspace('alice');
    const aliceId = await tripService.addTrip(trip);
    assert.equal((await tripService.getTripPage()).trips.length, 1);
    const parties = await vehicleTripService.getPartySummaries();
    assert.equal(parties.find(row => row.to === 'Acme').loadCount, 2);
    const acme = parties.find(row => row.to === 'Acme');
    const page = await vehicleTripService.getPartyTripPage({ partyId: acme.id, to: acme.to, month: '2026-09' });
    assert.equal(page.trips.length, 1);
    scope.activateWorkspace('bob');
    assert.equal((await tripService.getTripPage()).trips.length, 0);
    const bobId = await tripService.addTrip({ ...trip, amount: 999 });
    assert.equal((await tripService.getTripPage()).trips[0].id, bobId);
    scope.activateWorkspace('alice');
    await tripService.updateTrip(aliceId, { vehicleNo: 'MH12AB1234', date: '01-08-2026', dateTimestamp: firestore.Timestamp.fromDate(new Date(2026, 7, 1)), locations: [trip.locations[0]] });
    assert.equal((await vehicleTripService.getVehicleSummaries())[0].loadCount, 1);
    const updated = await vehicleTripService.getPartySummary(acme.id);
    assert.equal(updated.loadCount, 1);
    assert.equal(updated.monthCounts['2026-09'], 0);
    assert.equal(updated.monthCounts['2026-08'], 1);
    await tripService.deleteTrip(aliceId);
    assert.equal((await tripService.getTripPage()).trips.length, 0);
    assert.equal((await tripService.getArchivedTrips()).trips[0].id, aliceId);
    await tripService.restoreTrip(aliceId);
    assert.equal((await tripService.getArchivedTrips()).trips.length, 0);
    assert.equal((await tripService.getTripPage()).trips.length, 1);
    assert.equal((await vehicleTripService.getPartySummary(acme.id)).loadCount, 1);
    const pending = tripService.addTrip(trip);
    scope.activateWorkspace('bob');
    await pending;
    assert.equal((await tripService.getTripPage()).trips.length, 1);
    assert.equal((await tripService.getTripPage({ workspaceId: 'alice' })).trips.length, 2);
    scope.activateWorkspace('legacy');
    await assert.rejects(() => tripService.addTrip(trip), /preserved for review/);
    await assert.rejects(() => tripService.deleteTrip(aliceId), /preserved for review/);
    console.log('PASS: actual trip create/edit/archive/restore, party and month totals, normalized vehicles, encoded locations, isolated workspaces and in-flight switching.');
  } finally { await environment.cleanup(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
