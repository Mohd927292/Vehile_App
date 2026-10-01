import { loadRecords, searchKey } from '../utils/loadRecords';
import { getApps, initializeApp } from '@react-native-firebase/app';
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  getDocsFromServer as getDocs,
  getDocFromServer as getDoc,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  Timestamp,
} from '@react-native-firebase/firestore';
import {
  workspaceCollections,
  assertWritableWorkspace,
} from '../services/workspace';
import { getAuth } from '@react-native-firebase/auth';
import {
  partyKey,
  vehicleKey,
  countPartyLocations,
  locationCountChanges,
  matchingPartyLocations,
  tripMonthKey,
} from '../utils/tripData';

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
    const matches = await getDocs(
      query(refs.parties, where('partyKey', '==', key), limit(2)),
    );
    if (matches.docs.length > 1)
      throw new Error(
        `Multiple party records match ${location.to}. Resolve the duplicate before saving.`,
      );
    identities.set(
      key,
      matches.docs[0]?.id || `party:${encodeURIComponent(key)}`,
    );
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
  const oldMonth = tripMonthKey(previous);
  const newMonth = tripMonthKey(next);
  for (const key of new Set([oldVehicle, newVehicle].filter(Boolean))) {
    const monthDeltas = {};
    if (key === oldVehicle && oldMonth) monthDeltas[oldMonth] = -1;
    if (key === newVehicle && newMonth)
      monthDeltas[newMonth] = (monthDeltas[newMonth] || 0) + 1;
    const delta = Number(key === newVehicle) - Number(key === oldVehicle);
    if (delta || Object.values(monthDeltas).some(value => value !== 0)) {
      addChange(
        doc(refs.vehicles, key),
        delta,
        { vehicleNo: key },
        monthDeltas,
      );
    }
  }
  const oldParties = countPartyLocations(previous?.locations);
  const newParties = countPartyLocations(next?.locations);
  for (const id of new Set([...oldParties.keys(), ...newParties.keys()])) {
    const oldCount = oldParties.get(id)?.count || 0;
    const newCount = newParties.get(id)?.count || 0;
    const delta = newCount - oldCount;
    const monthDeltas = {};
    if (oldMonth)
      monthDeltas[oldMonth] = (monthDeltas[oldMonth] || 0) - oldCount;
    if (newMonth)
      monthDeltas[newMonth] = (monthDeltas[newMonth] || 0) + newCount;
    if (delta || Object.values(monthDeltas).some(value => value !== 0)) {
      const name = newParties.get(id)?.name || oldParties.get(id)?.name;
      addChange(
        doc(refs.parties, id),
        delta,
        { to: name, partyKey: partyKey(name) },
        monthDeltas,
      );
    }
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'from')) {
    addChange(doc(refs.fromcustomers, encodeURIComponent(name)), delta, {
      from: name,
      fromlower: name.toLowerCase(),
    });
  }

  // Firestore transactions require all reads before any writes.
  const summaries = [];
  for (const change of changes) {
    const snapshot = await transaction.get(change.reference);
    const current = Number(snapshot.data()?.loadCount) || 0;
    const monthCounts = { ...(snapshot.data()?.monthCounts || {}) };
    for (const [month, delta] of Object.entries(change.monthDeltas)) {
      monthCounts[month] = Math.max(
        0,
        (Number(monthCounts[month]) || 0) + delta,
      );
    }
    summaries.push({
      ...change,
      count: Math.max(0, current + change.delta),
      monthCounts,
    });
  }
  for (const summary of summaries) {
    transaction.set(
      summary.reference,
      {
        ...summary.fields,
        loadCount: summary.count,
        ...(Object.keys(summary.monthDeltas).length
          ? { monthCounts: summary.monthCounts }
          : {}),
        ...(summary.delta > 0 ? { lastTripAt: serverTimestamp() } : {}),
      },
      { merge: true },
    );
  }
};

// Trip service with batch operations
const tripService = {
  newTripId: () => doc(workspaceCollections().tripEntries).id,
  addTrip: async (tripData, workspaceId) => {
    const refs = workspaceCollections(assertWritableWorkspace(workspaceId));
    if (!tripData.locations?.length || tripData.locations.length > 100)
      throw new Error('Use 1–100 pairs per vehicle tab.');
    const locations = await resolvePartyLocations(tripData.locations, refs);
    const tripRef = tripData.clientId
      ? doc(refs.tripEntries, tripData.clientId)
      : doc(refs.tripEntries);
    return runTransaction(db, async transaction => {
      const existing = await transaction.get(tripRef);
      // Retrying a persisted draft cannot create the same vehicle trip twice.
      if (existing.exists()) return tripRef.id;
      const tripEntry = {
        ...tripData,
        locations,
        schemaVersion: 2,
        amountScope: tripData.amountScope || 'trip',
        vehicleKey: vehicleKey(tripData.vehicleNo),
        partyKeys: [
          ...new Set(locations.map(location => partyKey(location.to))),
        ],
        partyIds: [...new Set(locations.map(location => location.partyId))],
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        createdBy: authInstance.currentUser.uid,
      };
      await applySummaryChanges(transaction, null, tripEntry, refs);
      transaction.set(tripRef, tripEntry);
      for (const { id, ...load } of loadRecords(tripRef.id, tripEntry))
        transaction.set(doc(refs.loads, id), load);
      if (tripData.driverName)
        transaction.set(
          doc(
            refs.drivers,
            encodeURIComponent(tripData.driverName.toLowerCase()),
          ),
          { driverName: tripData.driverName.toLowerCase() },
          { merge: true },
        );
      return tripRef.id;
    });
  },

  deleteTrip: async tripId => {
    const refs = workspaceCollections(assertWritableWorkspace());
    return runTransaction(db, async transaction => {
      const tripRef = doc(refs.tripEntries, tripId);
      const snapshot = await transaction.get(tripRef);
      if (!snapshot.exists())
        throw new Error('Trip no longer exists. Refresh the list.');
      await applySummaryChanges(transaction, snapshot.data(), null, refs);
      transaction.set(doc(refs.archivedTrips, tripId), {
        ...snapshot.data(),
        deletedAt: serverTimestamp(),
        deletedBy: authInstance.currentUser.uid,
      });
      for (const load of loadRecords(tripId, snapshot.data()))
        transaction.delete(doc(refs.loads, load.id));
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
      if (!archive.exists())
        throw new Error('Archived trip is no longer available.');
      if (existing.exists())
        throw new Error('A trip with this ID already exists.');
      const { deletedAt, deletedBy, ...restored } = archive.data();
      await applySummaryChanges(transaction, null, restored, refs);
      transaction.set(tripRef, {
        ...restored,
        restoredAt: serverTimestamp(),
        restoredBy: authInstance.currentUser.uid,
      });
      for (const { id, ...load } of loadRecords(tripId, restored))
        transaction.set(doc(refs.loads, id), load);
      transaction.delete(archiveRef);
    });
  },

  getArchivedTrips: async ({ cursor = null, pageSize = 40 } = {}) => {
    const refs = workspaceCollections();
    const constraints = [orderBy('deletedAt', 'desc')];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(refs.archivedTrips, ...constraints));
    return {
      trips: snapshot.docs.map(item => ({ id: item.id, ...item.data() })),
      cursor: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  },

  updateTrip: async (tripId, changes) => {
    const refs = workspaceCollections(assertWritableWorkspace());
    const resolvedChanges = changes.locations
      ? {
          ...changes,
          locations: await resolvePartyLocations(changes.locations, refs),
        }
      : changes;
    return runTransaction(db, async transaction => {
      const tripRef = doc(refs.tripEntries, tripId);
      const snapshot = await transaction.get(tripRef);
      if (!snapshot.exists())
        throw new Error('Trip no longer exists. Refresh the list.');
      const previous = snapshot.data();
      const next = { ...previous, ...resolvedChanges };
      await applySummaryChanges(transaction, previous, next, refs);
      for (const load of loadRecords(tripId, previous))
        transaction.delete(doc(refs.loads, load.id));
      for (const { id, ...load } of loadRecords(tripId, next))
        transaction.set(doc(refs.loads, id), load);
      transaction.update(tripRef, {
        ...resolvedChanges,
        vehicleKey: vehicleKey(next.vehicleNo),
        partyKeys: [
          ...new Set(
            (next.locations || [])
              .map(location => partyKey(location.to))
              .filter(Boolean),
          ),
        ],
        partyIds: [
          ...new Set(
            (next.locations || [])
              .map(location => location.partyId)
              .filter(Boolean),
          ),
        ],
        updatedAt: serverTimestamp(),
        updatedBy: authInstance.currentUser.uid,
      });
    });
  },

  getLoadPage: async ({
    vehicleNo,
    partyId,
    month,
    cursor = null,
    pageSize = 40,
    direction = 'desc',
    sortField = 'dateTimestamp',
    search = '',
    fromDate,
    toDate,
    workspaceId,
  } = {}) => {
    const refs = workspaceCollections(workspaceId);
    if (!['dateTimestamp', 'createdAt', 'amount'].includes(sortField))
      throw new Error('Invalid sort field.');
    const constraints = [];
    if (vehicleNo)
      constraints.push(where('vehicleKey', '==', vehicleKey(vehicleNo)));
    if (partyId) constraints.push(where('partyId', '==', partyId));
    if (search.trim())
      constraints.push(
        where('searchTokens', 'array-contains', searchKey(search)),
      );
    let start = fromDate,
      end = toDate;
    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
        throw new Error('Invalid month.');
      const [year, number] = month.split('-').map(Number);
      const monthStart = new Date(year, number - 1, 1);
      const monthEnd = new Date(year, number, 1);
      monthEnd.setMilliseconds(-1);
      start = start && start > monthStart ? start : monthStart;
      end = end && end < monthEnd ? end : monthEnd;
    }
    if (start && end && start > end)
      return { trips: [], cursor: null, hasMore: false };
    if (start)
      constraints.push(where('dateTimestamp', '>=', Timestamp.fromDate(start)));
    if (end)
      constraints.push(where('dateTimestamp', '<=', Timestamp.fromDate(end)));
    const actualSort = start || end ? 'dateTimestamp' : sortField;
    constraints.push(orderBy(actualSort, direction));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(refs.loads, ...constraints));
    return {
      trips: snapshot.docs.map(item => ({ ...item.data(), id: item.id })),
      cursor: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  },
  getTripPage: async ({
    vehicleNo = null,
    cursor = null,
    pageSize = 40,
    direction = 'desc',
    workspaceId,
  } = {}) => {
    const refs = workspaceCollections(workspaceId);
    if (direction !== 'asc' && direction !== 'desc')
      throw new Error('Invalid date order.');
    const constraints = [];
    if (vehicleNo)
      constraints.push(where('vehicleKey', '==', vehicleKey(vehicleNo)));
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
  getVehicleSummary: async vehicleNo => {
    const refs = workspaceCollections();
    const snapshot = await getDoc(doc(refs.vehicles, vehicleKey(vehicleNo)));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },
  getVehicleSummaries: async () => {
    const refs = workspaceCollections();
    const snapshot = await getDocs(refs.vehicles);
    return snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => Number(item.loadCount) > 0)
      .sort((a, b) => String(a.vehicleNo).localeCompare(String(b.vehicleNo)));
  },
  getPartySummaries: async () => {
    const refs = workspaceCollections();
    const snapshot = await getDocs(refs.parties);
    return snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => Number(item.loadCount) > 0)
      .sort((a, b) => String(a.to).localeCompare(String(b.to)));
  },
  getPartySummary: async partyId => {
    const refs = workspaceCollections();
    const snapshot = await getDoc(doc(refs.parties, partyId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },

  getPartyTripPage: async ({
    partyId,
    to,
    month = null,
    cursor = null,
    pageSize = 40,
    direction = 'desc',
    workspaceId,
  }) => {
    const refs = workspaceCollections(workspaceId);
    if (!partyId) return { trips: [], cursor: null, hasMore: false };
    const constraints = [where('partyIds', 'array-contains', partyId)];
    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
        throw new Error('Invalid party month.');
      const [year, monthNumber] = month.split('-').map(Number);
      constraints.push(
        where(
          'dateTimestamp',
          '>=',
          Timestamp.fromDate(new Date(year, monthNumber - 1, 1)),
        ),
      );
      constraints.push(
        where(
          'dateTimestamp',
          '<',
          Timestamp.fromDate(new Date(year, monthNumber, 1)),
        ),
      );
    }
    constraints.push(orderBy('dateTimestamp', direction));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(refs.tripEntries, ...constraints));
    const trips = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(
        trip => matchingPartyLocations(trip, { id: partyId, to }).length > 0,
      );
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

export {
  db,
  authInstance as auth,
  tripService,
  customerService,
  vehicleTripService,
};
