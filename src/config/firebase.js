import { getApps, initializeApp } from '@react-native-firebase/app';
import { getFirestore, collection, doc, writeBatch, runTransaction, serverTimestamp, increment, getDocs, getDoc, query, where, orderBy, startAfter, limit, Timestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { partyKey, vehicleKey, countLocations, countPartyLocations, locationCountChanges, matchingPartyLocations, tripMonthKey } from '../utils/tripData';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

// Get Firestore and Auth instances
const db = getFirestore();
const authInstance = getAuth();

const resolvePartyLocations = async locations => {
  const identities = new Map();
  for (const location of locations || []) {
    const key = partyKey(location?.to);
    if (!key) throw new Error('Every route needs a destination party.');
    if (identities.has(key)) continue;
    const matches = await getDocs(query(partiesCollection, where('partyKey', '==', key), limit(2)));
    if (matches.docs.length > 1) throw new Error(`Multiple party records match ${location.to}. Resolve the duplicate before saving.`);
    identities.set(key, matches.docs[0]?.id || `party:${encodeURIComponent(key)}`);
  }
  return (locations || []).map(location => ({
    ...location,
    partyId: identities.get(partyKey(location.to)),
  }));
};

const applySummaryChanges = async (transaction, previous, next) => {
  const changes = [];
  const addChange = (reference, delta, fields = {}, monthDeltas = {}) => {
    changes.push({ reference, delta, fields, monthDeltas });
  };
  const oldVehicle = previous?.vehicleNo?.trim();
  const newVehicle = next?.vehicleNo?.trim();
  if (oldVehicle !== newVehicle) {
    if (oldVehicle) addChange(doc(vehiclesCollection, oldVehicle), -1);
    if (newVehicle) addChange(doc(vehiclesCollection, newVehicle), 1, { vehicleNo: newVehicle });
  }

  const oldParties = countPartyLocations(previous?.locations);
  const newParties = countPartyLocations(next?.locations);
  const oldMonth = tripMonthKey(previous);
  const newMonth = tripMonthKey(next);
  for (const id of new Set([...oldParties.keys(), ...newParties.keys()])) {
    const oldCount = oldParties.get(id)?.count || 0;
    const newCount = newParties.get(id)?.count || 0;
    const delta = newCount - oldCount;
    const monthDeltas = {};
    if (oldMonth) monthDeltas[oldMonth] = (monthDeltas[oldMonth] || 0) - oldCount;
    if (newMonth) monthDeltas[newMonth] = (monthDeltas[newMonth] || 0) + newCount;
    if (delta || Object.values(monthDeltas).some(value => value !== 0)) {
      const name = newParties.get(id)?.name || oldParties.get(id)?.name;
      addChange(doc(partiesCollection, id), delta, { to: name, partyKey: partyKey(name) }, monthDeltas);
    }
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'from')) {
    addChange(doc(fromcustomersCollection1, name), delta, { from: name, fromlower: name.toLowerCase() });
  }

  // Firestore transactions require all reads before any writes.
  const summaries = [];
  for (const change of changes) {
    const snapshot = await transaction.get(change.reference);
    const current = Number(snapshot.data()?.loadCount) || 0;
    const monthCounts = { ...(snapshot.data()?.monthCounts || {}) };
    for (const [month, delta] of Object.entries(change.monthDeltas)) {
      monthCounts[month] = Math.max(0, (Number(monthCounts[month]) || 0) + delta);
    }
    summaries.push({ ...change, count: Math.max(0, current + change.delta), monthCounts });
  }
  for (const summary of summaries) {
    transaction.set(summary.reference, {
      ...summary.fields,
      loadCount: summary.count,
      ...(Object.keys(summary.monthDeltas).length ? { monthCounts: summary.monthCounts } : {}),
      ...(summary.delta > 0 ? { lastTripAt: serverTimestamp() } : {}),
    }, { merge: true });
  }
};

// Collection references
export const tripEntriesCollection = collection(db, 'tripEntries');
export const vehiclesCollection = collection(db, 'vehicles');
export const partiesCollection = collection(db, 'parties');
export const driversCollection = collection(db, 'drivers');
export const fromcustomersCollection1 = collection(db, 'fromcustomers');
export const customersCollection = collection(db, 'customers');

// Trip service with batch operations
const tripService = {
  // Add new trip with batch write for consistency
  addTrip: async (tripData) => {
    const batch = writeBatch(db);
    
    try {
      const locations = await resolvePartyLocations(tripData.locations);
      // 1. Add to tripEntries
      const tripRef = doc(tripEntriesCollection);
      const tripEntry = {
        ...tripData,
        locations,
        vehicleKey: vehicleKey(tripData.vehicleNo),
        partyKeys: [...new Set(locations.map(location => partyKey(location.to)))],
        partyIds: [...new Set(locations.map(location => location.partyId))],
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
      };
      batch.set(tripRef, tripEntry);
      
      // 2. Update vehicles collection
      const vehicleRef = doc(vehiclesCollection, tripData.vehicleNo);
      batch.set(vehicleRef, {
        vehicleNo: tripData.vehicleNo,
        loadCount: increment(1),
        lastTripAt: serverTimestamp(),
      }, { merge: true });

      //3. Update drivers collection
      if (tripData.driverName) {
        const driverRef = doc(driversCollection, tripData.driverName.toLowerCase());
        batch.set(driverRef,{
          
          driverName: tripData.driverName.toLowerCase(),

        }, { merge: true });
      }

      // 4. Update fromcustomers collection for each location
      for (const [name, count] of countLocations(tripData.locations, 'from')) {
        batch.set(doc(fromcustomersCollection1, name), {
          from: name,
          fromlower: name.toLowerCase(),
          loadCount: increment(count),
          lastTripAt: serverTimestamp(),
        }, { merge: true });
      }

      // Count repeated party locations before writing each summary document once.
      for (const [id, { name, count }] of countPartyLocations(locations)) {
        const month = tripMonthKey(tripData);
        if (!month) throw new Error('Trip date is required for party history.');
        batch.set(doc(partiesCollection, id), {
          to: name,
          partyKey: partyKey(name),
          loadCount: increment(count),
          monthCounts: { [month]: increment(count) },
          lastTripAt: serverTimestamp(),
        }, { merge: true });
      }
      
      await batch.commit();
      return tripRef.id;
    } catch (error) {
      throw error;
    }
  },

  deleteTrip: async tripId => runTransaction(db, async transaction => {
    const tripRef = doc(tripEntriesCollection, tripId);
    const snapshot = await transaction.get(tripRef);
    if (!snapshot.exists()) throw new Error('Trip no longer exists. Refresh the list.');
    await applySummaryChanges(transaction, snapshot.data(), null);
    transaction.delete(tripRef);
  }),

  updateTrip: async (tripId, changes) => {
    const resolvedChanges = changes.locations
      ? { ...changes, locations: await resolvePartyLocations(changes.locations) }
      : changes;
    return runTransaction(db, async transaction => {
    const tripRef = doc(tripEntriesCollection, tripId);
    const snapshot = await transaction.get(tripRef);
    if (!snapshot.exists()) throw new Error('Trip no longer exists. Refresh the list.');
    const previous = snapshot.data();
    const next = { ...previous, ...resolvedChanges };
    await applySummaryChanges(transaction, previous, next);
    transaction.update(tripRef, {
      ...resolvedChanges,
      vehicleKey: vehicleKey(next.vehicleNo),
      partyKeys: [...new Set((next.locations || []).map(location => partyKey(location.to)).filter(Boolean))],
      partyIds: [...new Set((next.locations || []).map(location => location.partyId).filter(Boolean))],
      updatedAt: serverTimestamp(),
    });
    });
  },
  
  getTripPage: async ({ vehicleNo = null, cursor = null, pageSize = 40, direction = 'desc' } = {}) => {
    if (direction !== 'asc' && direction !== 'desc') throw new Error('Invalid date order.');
    const constraints = [];
    if (vehicleNo) constraints.push(where('vehicleKey', '==', vehicleKey(vehicleNo)));
    constraints.push(orderBy('dateTimestamp', direction));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(tripEntriesCollection, ...constraints));
    return {
      trips: snapshot.docs.map(item => ({ id: item.id, ...item.data() })),
      cursor: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  },
};

// Vehicle-Trip merged data service
const vehicleTripService = {
  getVehicleSummaries: async () => {
    const snapshot = await getDocs(vehiclesCollection);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(item => Number(item.loadCount) > 0)
      .sort((a, b) => String(a.vehicleNo).localeCompare(String(b.vehicleNo)));
  },
  getPartySummaries: async () => {
    const snapshot = await getDocs(partiesCollection);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(item => Number(item.loadCount) > 0)
      .sort((a, b) => String(a.to).localeCompare(String(b.to)));
  },
  getPartySummary: async partyId => {
    const snapshot = await getDoc(doc(partiesCollection, partyId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },

  getPartyTripPage: async ({ partyId, to, month = null, cursor = null, pageSize = 40, direction = 'desc' }) => {
    if (!partyId) return { trips: [], cursor: null, hasMore: false };
    const constraints = [where('partyIds', 'array-contains', partyId)];
    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid party month.');
      const [year, monthNumber] = month.split('-').map(Number);
      constraints.push(where('dateTimestamp', '>=', Timestamp.fromDate(new Date(year, monthNumber - 1, 1))));
      constraints.push(where('dateTimestamp', '<', Timestamp.fromDate(new Date(year, monthNumber, 1))));
    }
    constraints.push(orderBy('dateTimestamp', direction));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(tripEntriesCollection, ...constraints));
    const trips = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(trip => matchingPartyLocations(trip, { id: partyId, to }).length > 0);
    return {
      trips,
      cursor: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  },
};

// Customer service
const customerService = {
  getCustomers: async () => {
    try {
      const querySnapshot = await getDocs(customersCollection);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  },
};

export { db, authInstance as auth, tripService, customerService, vehicleTripService };
