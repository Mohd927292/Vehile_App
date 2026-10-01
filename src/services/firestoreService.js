import { workspaceCollection } from './workspace';
import { query, orderBy, startAt, endAt, limit, getDocs } from '@react-native-firebase/firestore';

// Get Firestore instance

// Fetch vehicle suggestions from Firestore
export const getVehicleSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchUpper = searchText.toUpperCase();
    const vehiclesRef = workspaceCollection('vehicles');
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
    const driverRef = workspaceCollection('drivers');
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

// Fetch from location suggestions from Firestore (using fromcustomers collection)
export const getFromLocationSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchLower = searchText.toLowerCase();
    const fromcustomersRef = workspaceCollection('fromcustomers');
    const q = query(
      fromcustomersRef,
      orderBy('fromlower'),
      startAt(searchLower),
      endAt(searchLower + '\uf8ff'),
      limit(10)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().from,
      label: doc.data().from,
      value: doc.id,
    }));
  } catch (error) {
    console.error('Error fetching from location suggestions:', error);
    return [];
  }
};

// Fetch customer suggestions from Firestore (using parties collection)
export const getCustomerSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchLower = searchText.toLowerCase();
    const customersRef = workspaceCollection('customers');
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
