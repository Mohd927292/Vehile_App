import { getApps, initializeApp } from '@react-native-firebase/app';
import { getFirestore, collection, doc, writeBatch, runTransaction, serverTimestamp, increment, getDocs } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { partyKey, vehicleKey, countLocations, locationCountChanges, tripSortTime, parseTripDate } from '../utils/tripData';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

// Get Firestore and Auth instances
const db = getFirestore();
const authInstance = getAuth();

const applySummaryChanges = async (transaction, previous, next) => {
  const changes = [];
  const addChange = (reference, delta, fields = {}) => {
    changes.push({ reference, delta, fields });
  };
  const oldVehicle = previous?.vehicleNo?.trim();
  const newVehicle = next?.vehicleNo?.trim();
  if (oldVehicle !== newVehicle) {
    if (oldVehicle) addChange(doc(vehiclesCollection, oldVehicle), -1);
    if (newVehicle) addChange(doc(vehiclesCollection, newVehicle), 1, { vehicleNo: newVehicle });
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'to')) {
    addChange(doc(partiesCollection, name), delta, { to: name });
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'from')) {
    addChange(doc(fromcustomersCollection1, name), delta, { from: name, fromlower: name.toLowerCase() });
  }

  // Firestore transactions require all reads before any writes.
  const summaries = [];
  for (const change of changes) {
    const snapshot = await transaction.get(change.reference);
    const current = Number(snapshot.data()?.loadCount) || 0;
    summaries.push({ ...change, count: Math.max(0, current + change.delta) });
  }
  for (const summary of summaries) {
    transaction.set(summary.reference, {
      ...summary.fields,
      loadCount: summary.count,
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
      // 1. Add to tripEntries
      const tripRef = doc(tripEntriesCollection);
      const tripEntry = {
        ...tripData,
        vehicleKey: vehicleKey(tripData.vehicleNo),
        partyKeys: [...new Set((tripData.locations || []).map(location => partyKey(location.to)).filter(Boolean))],
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
      for (const [name, count] of countLocations(tripData.locations, 'to')) {
        batch.set(doc(partiesCollection, name), {
          to: name,
          loadCount: increment(count),
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

  updateTrip: async (tripId, changes) => runTransaction(db, async transaction => {
    const tripRef = doc(tripEntriesCollection, tripId);
    const snapshot = await transaction.get(tripRef);
    if (!snapshot.exists()) throw new Error('Trip no longer exists. Refresh the list.');
    const previous = snapshot.data();
    const next = { ...previous, ...changes };
    await applySummaryChanges(transaction, previous, next);
    transaction.update(tripRef, {
      ...changes,
      vehicleKey: vehicleKey(next.vehicleNo),
      partyKeys: [...new Set((next.locations || []).map(location => partyKey(location.to)).filter(Boolean))],
      updatedAt: serverTimestamp(),
    });
  }),
  
  // Get trips by vehicle
  getTripsByVehicle: async (vehicleNo) => {
    try {
      // Legacy trips have no vehicleKey. Keep spelling variants together until backfill.
      const querySnapshot = await getDocs(tripEntriesCollection);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(trip => vehicleKey(trip.vehicleNo) === vehicleKey(vehicleNo))
        .sort((a, b) => tripSortTime(b) - tripSortTime(a));
    } catch (error) {
      throw error;
    }
  },
  
  // Get trips by party (to location)
  getTripsByParty: async (to) => {
    try {
      // Legacy records have no partyKeys, so retain them until a backfill is complete.
      const querySnapshot = await getDocs(tripEntriesCollection);
      return querySnapshot.docs
        .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
        .filter(trip => (trip.locations || []).some(location => partyKey(location?.to) === partyKey(to)))
        .sort((a, b) => tripSortTime(b) - tripSortTime(a));
    } catch (error) {
      throw error;
    }
  },
};

// Vehicle-Trip merged data service
const vehicleTripService = {
  getVehicleTripsData: async () => {
    try {
      const tripsSnapshot = await getDocs(tripEntriesCollection);

      const mergedData = tripsSnapshot.docs.map(doc => {
        const tripData = doc.data();
        
        return {
          id: doc.id,
          vehicleNo: tripData.vehicleNo,
          driverName: tripData.driverName,
          amount: tripData.amount,
          date: tripData.date,
          dateTimestamp: tripData.dateTimestamp,
          locations: tripData.locations,
          createdAt: parseTripDate(tripData.createdAt),
          loadCount: tripData.locations?.length || 0
        };
      });
      
      return mergedData.sort((a, b) => tripSortTime(b) - tripSortTime(a));
    } catch (error) {
      throw error;
    }
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
