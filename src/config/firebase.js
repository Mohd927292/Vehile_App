import { getApps, initializeApp } from '@react-native-firebase/app';
import firestore, { getFirestore, collection, doc, writeBatch, serverTimestamp, increment, getDocs, query, where, orderBy } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

// Get Firestore and Auth instances
const db = getFirestore();
const authInstance = getAuth();

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
      if (tripData.locations && tripData.locations.length > 0) {
        for (const location of tripData.locations) {
          if (location.from) {
            const fromcustomerRef = doc(fromcustomersCollection1, location.from);
            batch.set(fromcustomerRef, {
              from: location.from,
              loadCount: increment(1),
              lastTripAt: serverTimestamp(),
            }, { merge: true });
          }
        }
      }

      // 5. Update parties collection for each location
      if (tripData.locations && tripData.locations.length > 0) {
        for (const location of tripData.locations) {
          if (location.to) {
            const partyRef = doc(partiesCollection, location.to);
            batch.set(partyRef, {
              to: location.to,
              loadCount: increment(1),
              lastTripAt: serverTimestamp(),
            }, { merge: true });
          }
        }
      }
      
      await batch.commit();
      return tripRef.id;
    } catch (error) {
      throw error;
    }
  },
  
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
      const q = query(tripEntriesCollection, where('locations', 'array-contains-any', [{ to }]), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      // Fetch both collections in parallel
      const [vehiclesSnapshot, tripsSnapshot] = await Promise.all([
        getDocs(query(vehiclesCollection, orderBy('lastTripAt', 'desc'))),
        getDocs(query(tripEntriesCollection, orderBy('createdAt', 'desc')))
      ]);
      
      // Convert to maps for efficient lookup
      const vehiclesMap = new Map();
      vehiclesSnapshot.docs.forEach(doc => {
        vehiclesMap.set(doc.data().vehicleNo, doc.data());
      });
      
      // Merge trip data with vehicle data
      const mergedData = tripsSnapshot.docs.map(doc => {
        const tripData = doc.data();
        const vehicleData = vehiclesMap.get(tripData.vehicleNo) || {};
        
        return {
          id: doc.id,
          vehicleNo: tripData.vehicleNo,
          driverName: tripData.driverName,
          amount: tripData.amount,
          date: tripData.date,
          dateTimestamp: tripData.dateTimestamp,
          locations: tripData.locations,
          createdAt: tripData.createdAt?.toDate() || null,
          loadCount: vehicleData.loadCount || 0
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