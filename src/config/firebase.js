import { getApps, initializeApp } from '@react-native-firebase/app';
import { getFirestore, doc, writeBatch, runTransaction, serverTimestamp, increment, getDocs, getDoc, query, where, orderBy, startAfter, limit, Timestamp } from '@react-native-firebase/firestore';
import { workspaceCollections, assertWritableWorkspace } from '../services/workspace';
import { getAuth } from '@react-native-firebase/auth';
import { partyKey, vehicleKey, countLocations, countPartyLocations, locationCountChanges, matchingPartyLocations, tripMonthKey } from '../utils/tripData';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

// Get Firestore and Auth instances
const db = getFirestore();
const authInstance = getAuth();

const resolvePartyLocations = async (locations, refs) => {
  const identities = new Map();
  for (const location of locations || []) {
    const key = partyKey(location?.to);
    if (!key) throw new Error('Every route needs a destination party.');
    if (identities.has(key)) continue;
    const matches = await getDocs(query(refs.parties, where('partyKey', '==', key), limit(2)));
    if (matches.docs.length > 1) throw new Error(`Multiple party records match ${location.to}. Resolve the duplicate before saving.`);
    identities.set(key, matches.docs[0]?.id || `party:${encodeURIComponent(key)}`);
  }
  return (locations || []).map(location => ({
    ...location,
    partyId: identities.get(partyKey(location.to)),
  }));
};

const applySummaryChanges = async (transaction, previous, next, refs) => {
  const changes = [];
  const addChange = (reference, delta, fields = {}, monthDeltas = {}) => {
    changes.push({ reference, delta, fields, monthDeltas });
  };
  const oldVehicle = vehicleKey(previous?.vehicleNo);
  const newVehicle = vehicleKey(next?.vehicleNo);
  if (oldVehicle !== newVehicle) {
    if (oldVehicle) addChange(doc(refs.vehicles, oldVehicle), -1);
    if (newVehicle) addChange(doc(refs.vehicles, newVehicle), 1, { vehicleNo: newVehicle });
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
      addChange(doc(refs.parties, id), delta, { to: name, partyKey: partyKey(name) }, monthDeltas);
    }
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'from')) {
    addChange(doc(refs.fromcustomers, encodeURIComponent(name)), delta, { from: name, fromlower: name.toLowerCase() });
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

// Trip service with batch operations
const tripService = {
  // Add new trip with batch write for consistency
  addTrip: async (tripData, workspaceId) => {
    const refs = workspaceCollections(assertWritableWorkspace(workspaceId));
    const batch = writeBatch(db);
    
    try {
      const locations = await resolvePartyLocations(tripData.locations, refs);
      // 1. Add to tripEntries
      const tripRef = doc(refs.tripEntries);
      const tripEntry = {
        ...tripData,
        locations,
        vehicleKey: vehicleKey(tripData.vehicleNo),
        partyKeys: [...new Set(locations.map(location => partyKey(location.to)))],
        partyIds: [...new Set(locations.map(location => location.partyId))],
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        createdBy: authInstance.currentUser.uid,
      };
      batch.set(tripRef, tripEntry);
      
      // 2. Update vehicles collection
      const vehicleRef = doc(refs.vehicles, vehicleKey(tripData.vehicleNo));
      batch.set(vehicleRef, {
        vehicleNo: tripData.vehicleNo,
        loadCount: increment(1),
        lastTripAt: serverTimestamp(),
      }, { merge: true });

      //3. Update drivers collection
      if (tripData.driverName) {
        const driverRef = doc(refs.drivers, encodeURIComponent(tripData.driverName.toLowerCase()));
        batch.set(driverRef,{
          
          driverName: tripData.driverName.toLowerCase(),

        }, { merge: true });
      }

      // 4. Update fromcustomers collection for each location
      for (const [name, count] of countLocations(tripData.locations, 'from')) {
        batch.set(doc(refs.fromcustomers, encodeURIComponent(name)), {
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
        batch.set(doc(refs.parties, id), {
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

  deleteTrip: async tripId => {
    const refs = workspaceCollections(assertWritableWorkspace());
    return runTransaction(db, async transaction => {
    const tripRef = doc(refs.tripEntries, tripId);
    const snapshot = await transaction.get(tripRef);
    if (!snapshot.exists()) throw new Error('Trip no longer exists. Refresh the list.');
    await applySummaryChanges(transaction, snapshot.data(), null, refs);
    transaction.set(doc(refs.archivedTrips, tripId), { ...snapshot.data(), deletedAt: serverTimestamp(), deletedBy: authInstance.currentUser.uid });
    transaction.delete(tripRef);
    });
  },

  restoreTrip: async tripId => {
    const refs = workspaceCollections(assertWritableWorkspace());
    return runTransaction(db, async transaction => {
      const archiveRef = doc(refs.archivedTrips, tripId);
      const tripRef = doc(refs.tripEntries, tripId);
      const archive = await transaction.get(archiveRef);
      const existing = await transaction.get(tripRef);
      if (!archive.exists()) throw new Error("Archived trip is no longer available.");
      if (existing.exists()) throw new Error("A trip with this ID already exists.");
      const { deletedAt, deletedBy, ...restored } = archive.data();
      await applySummaryChanges(transaction, null, restored, refs);
      transaction.set(tripRef, { ...restored, restoredAt: serverTimestamp(), restoredBy: authInstance.currentUser.uid });
      transaction.delete(archiveRef);
    });
  },

  getArchivedTrips: async ({ cursor = null, pageSize = 40 } = {}) => {
    const refs = workspaceCollections();
    const constraints = [orderBy("deletedAt", "desc")];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(refs.archivedTrips, ...constraints));
    return { trips: snapshot.docs.map(item => ({ id: item.id, ...item.data() })), cursor: snapshot.docs[snapshot.docs.length - 1] || null, hasMore: snapshot.docs.length === pageSize };
  },

  updateTrip: async (tripId, changes) => {
    const refs = workspaceCollections(assertWritableWorkspace());
    const resolvedChanges = changes.locations
      ? { ...changes, locations: await resolvePartyLocations(changes.locations, refs) }
      : changes;
    return runTransaction(db, async transaction => {
    const tripRef = doc(refs.tripEntries, tripId);
    const snapshot = await transaction.get(tripRef);
    if (!snapshot.exists()) throw new Error('Trip no longer exists. Refresh the list.');
    const previous = snapshot.data();
    const next = { ...previous, ...resolvedChanges };
    await applySummaryChanges(transaction, previous, next, refs);
    transaction.update(tripRef, {
      ...resolvedChanges,
      vehicleKey: vehicleKey(next.vehicleNo),
      partyKeys: [...new Set((next.locations || []).map(location => partyKey(location.to)).filter(Boolean))],
      partyIds: [...new Set((next.locations || []).map(location => location.partyId).filter(Boolean))],
      updatedAt: serverTimestamp(),
      updatedBy: authInstance.currentUser.uid,
    });
    });
  },
  
  getTripPage: async ({ vehicleNo = null, cursor = null, pageSize = 40, direction = 'desc', workspaceId } = {}) => {
    const refs = workspaceCollections(workspaceId);
    if (direction !== 'asc' && direction !== 'desc') throw new Error('Invalid date order.');
    const constraints = [];
    if (vehicleNo) constraints.push(where('vehicleKey', '==', vehicleKey(vehicleNo)));
    constraints.push(orderBy('dateTimestamp', direction));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(refs.tripEntries, ...constraints));
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
    const refs = workspaceCollections();
    const snapshot = await getDocs(refs.vehicles);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(item => Number(item.loadCount) > 0)
      .sort((a, b) => String(a.vehicleNo).localeCompare(String(b.vehicleNo)));
  },
  getPartySummaries: async () => {
    const refs = workspaceCollections();
    const snapshot = await getDocs(refs.parties);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(item => Number(item.loadCount) > 0)
      .sort((a, b) => String(a.to).localeCompare(String(b.to)));
  },
  getPartySummary: async partyId => {
    const refs = workspaceCollections();
    const snapshot = await getDoc(doc(refs.parties, partyId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },

  getPartyTripPage: async ({ partyId, to, month = null, cursor = null, pageSize = 40, direction = 'desc', workspaceId }) => {
    const refs = workspaceCollections(workspaceId);
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
    const snapshot = await getDocs(query(refs.tripEntries, ...constraints));
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
    const refs = workspaceCollections();
    try {
      const querySnapshot = await getDocs(refs.customers);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  },
};

export { db, authInstance as auth, tripService, customerService, vehicleTripService };
