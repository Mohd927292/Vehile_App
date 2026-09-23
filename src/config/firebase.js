import { getApps, initializeApp } from '@react-native-firebase/app';
import { getFirestore, collection, doc, writeBatch, runTransaction, serverTimestamp, increment, getDocs, query, where, orderBy } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { partyKey, vehicleKey, countLocations, locationCountChanges } from '../utils/tripData';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

// Get Firestore and Auth instances
const db = getFirestore();
const authInstance = getAuth();

const applySummaryChanges = (transaction, previous, next) => {
  const oldVehicle = previous?.vehicleNo?.trim();
  const newVehicle = next?.vehicleNo?.trim();
  if (oldVehicle !== newVehicle) {
    if (oldVehicle) transaction.set(doc(vehiclesCollection, oldVehicle), { loadCount: increment(-1) }, { merge: true });
    if (newVehicle) transaction.set(doc(vehiclesCollection, newVehicle), {
      vehicleNo: newVehicle, loadCount: increment(1), lastTripAt: serverTimestamp(),
    }, { merge: true });
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'to')) {
    transaction.set(doc(partiesCollection, name), {
      to: name, loadCount: increment(delta), lastTripAt: serverTimestamp(),
    }, { merge: true });
  }

  for (const [name, delta] of locationCountChanges(previous, next, 'from')) {
    transaction.set(doc(fromcustomersCollection1, name), {
      from: name, fromlower: name.toLowerCase(),
      loadCount: increment(delta), lastTripAt: serverTimestamp(),
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
    applySummaryChanges(transaction, snapshot.data(), null);
    transaction.delete(tripRef);
  }),

  updateTrip: async (tripId, changes) => runTransaction(db, async transaction => {
    const tripRef = doc(tripEntriesCollection, tripId);
    const snapshot = await transaction.get(tripRef);
    if (!snapshot.exists()) throw new Error('Trip no longer exists. Refresh the list.');
    const previous = snapshot.data();
    const next = { ...previous, ...changes };
    applySummaryChanges(transaction, previous, next);
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
      const q = query(tripEntriesCollection, where('vehicleNo', '==', vehicleNo), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  },
  
  // Get trips by party (to location)
  getTripsByParty: async (to) => {
    try {
      // Legacy records have no partyKeys, so retain them until a backfill is complete.
      const q = query(tripEntriesCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
        .filter(trip => (trip.locations || []).some(location => partyKey(location.to) === partyKey(to)));
    } catch (error) {
      throw error;
    }
  },
  
  // Get all vehicles
  getVehicles: async () => {
    try {
      const q = query(vehiclesCollection, orderBy('lastTripAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  },
  
  // Get all parties
  getParties: async () => {
    try {
      const q = query(partiesCollection, orderBy('lastTripAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  },
};

// Vehicle-Trip merged data service
const vehicleTripService = {
  getVehicleTripsData: async () => {
    try {
      const tripsSnapshot = await getDocs(query(tripEntriesCollection, orderBy('createdAt', 'desc')));

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
          createdAt: tripData.createdAt?.toDate() || null,
          loadCount: tripData.locations?.length || 0
        };
      });
      
      return mergedData;
    } catch (error) {
      throw error;
    }
  },

  
  getPartyTripData: async () => {
    try {
      const partySnapshot = await getDocs(query(partiesCollection, where('loadCount', '>', 0), orderBy('lastTripAt', 'desc')));
      
      const parties = partySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          to: data.to,
          loadCount: data.loadCount || 0,
          createdAt: data.lastTripAt?.toDate() || null
        };
      });
      
      return parties;
    } catch (error) {
      throw error;
    }
  }


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
