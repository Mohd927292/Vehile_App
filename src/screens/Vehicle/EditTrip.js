import { workspaceCollection } from '../../services/workspace';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { doc, getDoc, Timestamp } from '@react-native-firebase/firestore';
import { tripService } from '../../config/firebase';
import { parseTripDate } from '../../utils/tripData';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../hooks/useTheme';

const formatTripDate = date =>
  `${String(date.getDate()).padStart(2, '0')}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${date.getFullYear()}`;

const EditTrip = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const savingRef = useRef(false);
  const [tripData, setTripData] = useState({
    date: '',
    vehicleNo: '',
    driverName: '',
    amount: '',
    locations: [],
  });

  const fetchTripData = useCallback(async () => {
    try {
      if (!tripId) throw new Error('Trip ID is missing');
      const tripDoc = await getDoc(
        doc(workspaceCollection('tripEntries'), tripId),
      );

      if (tripDoc.exists()) {
        const data = tripDoc.data();
        setTripData({
          date: data.date || '',
          vehicleNo: data.vehicleNo || '',
          driverName: data.driverName || '',
          amount: data.amount != null ? data.amount.toString() : '',
          locations: data.locations || [],
        });
      } else {
        Alert.alert(
          'Trip unavailable',
          'This trip was deleted. Refresh the list.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
      Alert.alert('Error', 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  }, [tripId, navigation]);

  useEffect(() => {
    fetchTripData();
  }, [fetchTripData]);

  const updateTrip = async () => {
    if (savingRef.current) return;
    try {
      const date = parseTripDate(tripData.date);
      const vehicleNo = tripData.vehicleNo.trim().toUpperCase();
      const locations = tripData.locations.map(location => ({
        from: location.from?.trim() || '',
        to: location.to?.trim() || '',
      }));
      const amount = tripData.amount.trim() ? Number(tripData.amount) : null;
      if (
        !date ||
        !vehicleNo ||
        !tripData.driverName.trim() ||
        !locations.length ||
        locations.some(location => !location.from || !location.to) ||
        (amount !== null && (!Number.isFinite(amount) || amount < 0))
      ) {
        Alert.alert(
          'Check trip',
          'Enter a valid date (DD-MM-YYYY), vehicle, driver, locations, and amount.',
        );
        return;
      }
      savingRef.current = true;
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
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Failed to update trip');
    } finally {
      savingRef.current = false;
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

  const removeLocation = index => {
    const newLocations = tripData.locations.filter((_, i) => i !== index);
    setTripData({ ...tripData, locations: newLocations });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Trip</Text>
        <TouchableOpacity
          onPress={updateTrip}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
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
          <Text style={[styles.label, { color: colors.text }]}>Date</Text>
          <TouchableOpacity
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose trip date"
          >
            <Text style={[styles.dateValue, { color: colors.text }]}>
              {tripData.date || 'Choose date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={parseTripDate(tripData.date) || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate)
                  setTripData(previous => ({
                    ...previous,
                    date: formatTripDate(selectedDate),
                  }));
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Vehicle No</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={tripData.vehicleNo}
            onChangeText={text => setTripData({ ...tripData, vehicleNo: text })}
            placeholder="Enter vehicle number"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Driver Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            multiline
            submitBehavior="newline"
            blurOnSubmit={false}
            value={tripData.driverName}
            onChangeText={text =>
              setTripData({ ...tripData, driverName: text })
            }
            placeholder="Enter driver name"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Amount</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={tripData.amount}
            onChangeText={text => setTripData({ ...tripData, amount: text })}
            placeholder="Enter amount (optional)"
            placeholderTextColor="#888"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: colors.text }]}>
              Locations
            </Text>
            <TouchableOpacity
              onPress={addLocation}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addButtonText}>+ Add Location</Text>
            </TouchableOpacity>
          </View>

          {tripData.locations &&
            tripData.locations.map((location, index) => (
              <View
                key={index}
                style={[
                  styles.pairContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.pairLabel, { color: colors.primary }]}>
                  Location {index + 1}
                </Text>
                <View style={styles.pairInputs}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.pairInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    submitBehavior="newline"
                    blurOnSubmit={false}
                    textAlignVertical="top"
                    value={location.from}
                    onChangeText={text => updateLocation(index, 'from', text)}
                    placeholder="From"
                    placeholderTextColor="#888"
                  />
                  <Text style={[styles.arrow, { color: colors.textSecondary }]}>
                    →
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.pairInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    submitBehavior="newline"
                    blurOnSubmit={false}
                    textAlignVertical="top"
                    value={location.to}
                    onChangeText={text => updateLocation(index, 'to', text)}
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
  },
  header: {
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  dateValue: { fontSize: 16 },
  pairContainer: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  pairLabel: {
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
