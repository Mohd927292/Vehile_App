import { getFirestore, collection, query, orderBy, startAt, endAt, limit, getDocs, addDoc } from '@react-native-firebase/firestore';

// Get Firestore instance
const db = getFirestore();

// Fetch vehicle suggestions from Firestore
export const getVehicleSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchUpper = searchText.toUpperCase();
    const vehiclesRef = collection(db, 'vehicles');
    const q = query(
      vehiclesRef,
      orderBy('vehicleNo'),
      startAt(searchUpper),
      endAt(searchUpper + '\uf8ff'),
      limit(10)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      vehicleNo: doc.data().vehicleNo,
    }));
  } catch (error) {
    console.error('Error fetching vehicle suggestions:', error);
    return [];
  }
};

// Fetch driver suggestions from Firestore
export const getDriverSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchLower = searchText.toLowerCase();
    const driverRef = collection(db, 'drivers');
    const q = query(
      driverRef,
      orderBy('driverName'),
      startAt(searchLower),
      endAt(searchLower + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      driverName: doc.data().driverName,
      label: doc.data().driverName,
    }));
  } catch (error) {
    console.error('Error fetching driver suggestions:', error);
    return [];
  }
}

// Save driver name to Firestore collection
export const saveDriverName = async (driverName) => {
  if (!driverName.trim()) return;
  
  try {
    const trimmedName = driverName.trim().toLowerCase();
    const driversRef = collection(db, 'drivers');
    
    // Check if driver already exists
    const q = query(driversRef, orderBy('driverName'), startAt(trimmedName), endAt(trimmedName + '\uf8ff'), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(driversRef, {
        driverName: trimmedName,
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error saving driver name:', error);
  }
};

// Fetch customer suggestions from Firestore (using parties collection)
export const getCustomerSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchLower = searchText.toLowerCase();
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      orderBy('msnamelower'),
      startAt(searchLower),
      endAt(searchLower + '\uf8ff'),
      limit(10)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().msName,
      label: doc.data().msName,
      value: doc.id,
    }));
  } catch (error) {
    console.error('Error fetching customer suggestions:', error);
    return [];
  }
};
