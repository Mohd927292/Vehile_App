import firestore from '@react-native-firebase/firestore';

// Fetch vehicle suggestions from Firestore
export const getVehicleSuggestions = async searchText => {
  if (!searchText.trim()) return [];

  try {
    const searchUpper = searchText.toUpperCase();
    const snapshot = await firestore()
      .collection('vehicles')
      .orderBy('vehicleNo')
      .startAt(searchUpper)
      .endAt(searchUpper + '\uf8ff')
      .limit(10)
      .get();

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

    const snapshot = await firestore()
      .collection('customers')
      .orderBy('msnamelower')
      .startAt(searchLower)
      .endAt(searchLower + '\uf8ff')
      .limit(10)
      .get();

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
