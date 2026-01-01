import { getFirestore, collection, query, orderBy, startAt, endAt, limit, getDocs } from '@react-native-firebase/firestore';

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

// Fetch customer suggestions from Firestore (using parties collection)
export const getCustomerSuggestions = async searchText => {
  console.log('🔍 getCustomerSuggestions called with:', searchText);
  if (!searchText.trim()) {
    console.log('❌ Empty search text, returning empty array');
    return [];
  }

  try {
    const searchLower = searchText.toLowerCase();
    console.log('🔍 Searching for:', searchLower);

    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      orderBy('msnamelower'),
      startAt(searchLower),
      endAt(searchLower + '\uf8ff'),
      limit(10)
    );
    const snapshot = await getDocs(q);

    console.log('📊 Firestore query returned:', snapshot.size, 'documents');

    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().msName,
      label: doc.data().msName, // UI reads this
      value: doc.id, // optional, if component expects value
    }));

    

    console.log('✅ Customer suggestions:', results);
    return results;
  } catch (error) {
    console.error('❌ Error fetching customer suggestions:', error);
    return [];
  }
};
