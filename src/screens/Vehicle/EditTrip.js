import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getFirestore, doc, getDoc, Timestamp } from '@react-native-firebase/firestore';
import { tripService } from '../../config/firebase';
import { parseTripDate } from '../../utils/tripData';

const EditTrip = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tripData, setTripData] = useState({
    date: '',
    vehicleNo: '',
    driverName: '',
    amount: '',
    locations: []
  });

  const fetchTripData = useCallback(async () => {
    try {
      const db = getFirestore();
      const tripDoc = await getDoc(doc(db, 'tripEntries', tripId));
      
      if (tripDoc.exists()) {
        const data = tripDoc.data();
        setTripData({
          date: data.date || '',
          vehicleNo: data.vehicleNo || '',
          driverName: data.driverName || '',
          amount: data.amount ? data.amount.toString() : '',
          locations: data.locations || []
        });
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
      Alert.alert('Error', 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { fetchTripData(); }, [fetchTripData]);

  const updateTrip = async () => {
    try {
      const date = parseTripDate(tripData.date);
      const vehicleNo = tripData.vehicleNo.trim().toUpperCase();
      const locations = tripData.locations.map(location => ({
        from: location.from?.replace(/\s+/g, ' ').trim() || '',
        to: location.to?.replace(/\s+/g, ' ').trim() || '',
      }));
      const amount = tripData.amount.trim() ? Number(tripData.amount) : null;
      if (!date || !vehicleNo || !tripData.driverName.trim() ||
          !locations.length || locations.some(location => !location.from || !location.to) ||
          (amount !== null && (!Number.isFinite(amount) || amount < 0))) {
        Alert.alert('Check trip', 'Enter a valid date (DD-MM-YYYY), vehicle, driver, locations, and amount.');
        return;
      }
      setSaving(true);
      await tripService.updateTrip(tripId, {
        date: tripData.date,
        dateTimestamp: Timestamp.fromDate(date),
        vehicleNo,
        driverName: tripData.driverName.trim(),
        amount,
        locations,
      });
      
        Alert.alert('Success', 'Trip updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Failed to update trip');
    } finally {
      setSaving(false);
    }
  };

  const updateLocation = (index, field, value) => {
    const newLocations = [...tripData.locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setTripData({ ...tripData, locations: newLocations });
  };

  const addLocation = () => {
    const newLocations = [...tripData.locations, { from: '', to: '' }];
    setTripData({ ...tripData, locations: newLocations });
  };

  const removeLocation = (index) => {
    const newLocations = tripData.locations.filter((_, i) => i !== index);
    setTripData({ ...tripData, locations: newLocations });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Trip</Text>
        <TouchableOpacity
          onPress={updateTrip}
          style={styles.saveButton}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={tripData.date}
            onChangeText={(text) => setTripData({ ...tripData, date: text })}
            placeholder="Enter date"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Vehicle No</Text>
          <TextInput
            style={styles.input}
            value={tripData.vehicleNo}
            onChangeText={(text) => setTripData({ ...tripData, vehicleNo: text })}
            placeholder="Enter vehicle number"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Driver Name</Text>
          <TextInput
            style={styles.input}
            value={tripData.driverName}
            onChangeText={(text) => setTripData({ ...tripData, driverName: text })}
            placeholder="Enter driver name"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={tripData.amount}
            onChangeText={(text) => setTripData({ ...tripData, amount: text })}
            placeholder="Enter amount (optional)"
            placeholderTextColor="#888"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Locations</Text>
            <TouchableOpacity onPress={addLocation} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add Location</Text>
            </TouchableOpacity>
          </View>
          
          {tripData.locations && tripData.locations.map((location, index) => (
            <View key={index} style={styles.pairContainer}>
              <Text style={styles.pairLabel}>Location {index + 1}</Text>
              <View style={styles.pairInputs}>
                <TextInput
                  style={[styles.input, styles.pairInput]}
                  value={location.from}
                  onChangeText={(text) => updateLocation(index, 'from', text)}
                  placeholder="From"
                  placeholderTextColor="#888"
                />
                <Text style={styles.arrow}>→</Text>
                <TextInput
                  style={[styles.input, styles.pairInput]}
                  value={location.to}
                  onChangeText={(text) => updateLocation(index, 'to', text)}
                  placeholder="To"
                  placeholderTextColor="#888"
                />
                {tripData.locations.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeLocation(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditTrip;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#7b2ff2',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 16,
  },
  pairContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  pairLabel: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pairInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  arrow: {
    color: '#fff',
    fontSize: 18,
    marginHorizontal: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
