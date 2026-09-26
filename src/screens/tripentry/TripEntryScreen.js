import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Appbar,
  Provider as PaperProvider,
  Dialog,
  Portal,
  Paragraph,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

import { auth, tripService } from '../../config/firebase';
import AutoSuggestInput from '../../components/AutoSuggestInput';
import { getVehicleSuggestions, getCustomerSuggestions, getDriverSuggestions, getFromLocationSuggestions } from '../../services/firestoreService';
import { getFirestore, collection, query, where, limit, getDocs, Timestamp } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';

const draftKey = () => `tripEntryDraft:${auth.currentUser?.uid || 'signed-out'}`;

export const saveDraft = async (data) => {
  try {
    await AsyncStorage.setItem(draftKey(), JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save trip draft:', e);
  }
};

export const loadDraft = async () => {
  try {
    const value = await AsyncStorage.getItem(draftKey());
    if (value) {
      return JSON.parse(value);
    }
  } catch (e) {
    console.warn('Failed to load trip draft:', e);
  }
  return null;
};

export const clearDraft = async () => {
  try {
    await AsyncStorage.removeItem(draftKey());
  } catch (e) {
    console.warn('Failed to clear trip draft:', e);
  }
};

const TripEntryScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const screenWidth = Dimensions.get('window').width;
  const [hydrated, setHydrated] = useState(false);
  const [trips, setTrips] = useState([{
    vehicleNo: '',
    driverName: '',
    amount: '',
    locations: [{ from: '', to: '' }],
    date: new Date(),
  }]);
  const [loading, setLoading] = useState(false);
  const [datePickerState, setDatePickerState] = useState({ show: false, tripIndex: -1 });
  const [currentTripIndex, setCurrentTripIndex] = useState(0);
  const [customerDialog, setCustomerDialog] = useState({ visible: false, field: '', tripIndex: -1, locationIndex: -1 });
  const tripsScrollRef = useRef(null);
  const [pendingScrollIndex, setPendingScrollIndex] = useState(null);

  // Step 3: Debounced auto-save logic
  const draftSaveTimeout = useRef();
  const submittingRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || completedRef.current) return;
    if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current);

    draftSaveTimeout.current = setTimeout(() => {
      saveDraft({ trips, currentTripIndex });
    }, 800); // 800ms debounce

    return () => clearTimeout(draftSaveTimeout.current);
  }, [trips, currentTripIndex, hydrated]);

  // Step 2: Restore draft trips on mount
  useEffect(() => {
    (async () => {
      const data = await loadDraft();
      if (
        data &&
        Array.isArray(data.trips) && data.trips.length > 0 &&
        typeof data.currentTripIndex === 'number'
      ) {
        // Fix: convert date field back to Date (if restored as string)
        const tripsWithDateObjs = data.trips.map(trip => ({
          ...trip,
          date: trip.date && !isNaN(new Date(trip.date).getTime()) ? new Date(trip.date) : new Date(),
        }));
        setTrips(tripsWithDateObjs);
        setCurrentTripIndex(
          Math.min(data.currentTripIndex, Math.max(data.trips.length - 1, 0))
        );
        // Wait for state to apply, then scroll to the last trip
        setTimeout(() => {
          if (tripsScrollRef.current) {
            const idx = Math.max(data.trips.length - 1, 0);
            tripsScrollRef.current.scrollTo?.({ x: idx * screenWidth, animated: false });
          }
        }, 200);
      }
      setHydrated(true);
    })();
  }, [screenWidth]);

   
  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`; // DD-MM-YYYY format
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY for UI display
  };

  const showDatePicker = (tripIndex) => {
    setDatePickerState({ show: true, tripIndex });
  };

  const onDateChange = (event, selectedDate) => {
    setDatePickerState({ show: false, tripIndex: -1 });
    if (selectedDate && datePickerState.tripIndex >= 0) {
      setTrips(previous => previous.map((trip, index) =>
        index === datePickerState.tripIndex ? { ...trip, date: selectedDate } : trip
      ));
    }
  };

  const addTrip = () => {
    const newIndex = trips.length; // index of the trip we are going to add
    setTrips([...trips, {
      vehicleNo: '',
      driverName: '',
      amount: '',
      locations: [{ from: '', to: '' }],
      date: new Date(),
    }]);
    setPendingScrollIndex(newIndex);
  };

  useEffect(() => {
    if (
      pendingScrollIndex !== null &&
      trips.length > pendingScrollIndex &&
      tripsScrollRef.current
    ) {
      const x = pendingScrollIndex * screenWidth;
      tripsScrollRef.current.scrollTo({ x, animated: true });
      setCurrentTripIndex(pendingScrollIndex);
      setPendingScrollIndex(null);
    }
  }, [pendingScrollIndex, trips.length, screenWidth]);

  const removeTrip = (tripIndex) => {
    if (trips.length > 1) {
      setTrips(previous => previous.filter((_, i) => i !== tripIndex));
      setCurrentTripIndex(index => Math.min(index, trips.length - 2));
    }
  };

  const updateTrip = (tripIndex, field, value) => {
    setTrips(previous => previous.map((trip, index) =>
      index === tripIndex ? { ...trip, [field]: value } : trip
    ));
  };

  const addLocationPair = (tripIndex) => {
    setTrips(previous => previous.map((trip, index) =>
      index === tripIndex
        ? { ...trip, locations: [...trip.locations, { from: '', to: '' }] }
        : trip
    ));
  };

  const removeLocationPair = (tripIndex, locationIndex) => {
    setTrips(previous => previous.map((trip, index) =>
      index === tripIndex && trip.locations.length > 1
        ? { ...trip, locations: trip.locations.filter((_, i) => i !== locationIndex) }
        : trip
    ));
  };

  const updateLocation = (tripIndex, locationIndex, field, value) => {
    setTrips(previous => previous.map((trip, index) =>
      index === tripIndex
        ? { ...trip, locations: trip.locations.map((location, i) =>
          i === locationIndex ? { ...location, [field]: value } : location
        ) }
        : trip
    ));
  };

  const handleDriverSuggestion = (tripIndex, suggestion) => {
    const rawValue = suggestion.driverName || suggestion.label || '';
    const value = rawValue.replace(/\s+/g, ' ').trim();
    updateTrip(tripIndex, 'driverName', value);
  };

  const handleVehicleSuggestion = (tripIndex, suggestion) => {
    const rawValue = suggestion.vehicleNo || suggestion.name || suggestion.label || '';
    const value = rawValue.replace(/\s+/g, ' ').trim();
    updateTrip(tripIndex, 'vehicleNo', value);
  };

  const handleLocationSuggestion = (tripIndex, locationIndex, field, suggestion) => {
    const rawValue = suggestion.label || suggestion.name || suggestion.vehicleNo || '';
    const value = rawValue.replace(/\s+/g, ' ').trim();
    updateLocation(tripIndex, locationIndex, field, value);
  };

  // Validate customer exists in Firestore
  const validateCustomer = async (customerName) => {
    try {
      const trimmedName = customerName.replace(/\s+/g, ' ').trim();
      if (!trimmedName) return false;
      
      const db = getFirestore();
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('msnamelower', '==', trimmedName.toLowerCase()), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error validating customer:', error);
      return false;
    }
  };

  // Handle location text change
  const handleLocationChange = (tripIndex, locationIndex, field, value) => {
    updateLocation(tripIndex, locationIndex, field, value);
  };

  // Validate location on blur
  const handleLocationBlur = async (tripIndex, locationIndex, field, value) => {
    if (field !== 'to') return;
    const trimmedValue = value.replace(/\s+/g, ' ').trim();
    if (trimmedValue && trimmedValue.length > 0) {
      const isValid = await validateCustomer(trimmedValue);
      if (!isValid) {
        setCustomerDialog({
          visible: true,
          field,
          tripIndex,
          locationIndex,
          customerName: trimmedValue
        });
      }
    }
  };

  // Handle customer not found dialog
  const handleCustomerNotFound = () => {
    setCustomerDialog({ visible: false, field: '', tripIndex: -1, locationIndex: -1 });
  };

  const navigateToAddCustomer = () => {
    const { customerName } = customerDialog;
    setCustomerDialog({ visible: false, field: '', tripIndex: -1, locationIndex: -1 });
    navigation.navigate('AddCustomer', { customerName });
  };

  const validateTrip = (trip, tripIndex) => {
    if (!trip.vehicleNo?.trim()) {
      return `Vehicle number is required for trip ${tripIndex + 1}`;
    }
    if (!trip.driverName?.trim()) {
      return `Driver name is required for trip ${tripIndex + 1}`;
    }
    const amountText = String(trip.amount ?? '').trim();
    if (amountText && (!Number.isFinite(Number(amountText)) || Number(amountText) < 0)) {
      return `Enter a valid amount for trip ${tripIndex + 1}`;
    }
    if (isNaN(new Date(trip.date).getTime())) {
      return `Enter a valid date for trip ${tripIndex + 1}`;
    }
    if (!Array.isArray(trip.locations) || trip.locations.length === 0) {
      return `Add a route for trip ${tripIndex + 1}`;
    }
    for (let i = 0; i < trip.locations.length; i++) {
      if (!trip.locations[i]?.from?.trim()) {
        return `From location is required for trip ${tripIndex + 1}, pair ${i + 1}`;
      }
      if (!trip.locations[i]?.to?.trim()) {
        return `To location is required for trip ${tripIndex + 1}, pair ${i + 1}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (submittingRef.current || completedRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    // Validate all trips
    for (let i = 0; i < trips.length; i++) {
      const error = validateTrip(trips[i], i);
      if (error) {
        Alert.alert('Validation Error', error);
        submittingRef.current = false;
        setLoading(false);
        return;
      }
    }

    // Validate all customers exist
    for (let i = 0; i < trips.length; i++) {
      for (let j = 0; j < trips[i].locations.length; j++) {
        const { to } = trips[i].locations[j];
        const trimmedTo = to.replace(/\s+/g, ' ').trim();
        if (trimmedTo) {
          const isValid = await validateCustomer(trimmedTo);
          if (!isValid) {
            Alert.alert('Customer Not Found', `Customer "${trimmedTo}" in trip ${i + 1} not found. Please add customer first.`);
            submittingRef.current = false;
            setLoading(false);
            return;
          }
        }
      }
    }
    const results = { success: 0, failed: 0, errors: [] };
    const failedTrips = [];

    try {
      for (let i = 0; i < trips.length; i++) {
        try {
          const tripData = {
            vehicleNo: trips[i].vehicleNo.toUpperCase().trim(),
            driverName: trips[i].driverName.trim(),
            amount: String(trips[i].amount ?? '').trim() ? Number(trips[i].amount.trim()) : null,
            locations: trips[i].locations?.map(loc => ({
              from: loc?.from?.replace(/\s+/g, ' ').trim() || '',
              to: loc?.to?.replace(/\s+/g, ' ').trim() || ''
            })) || [],
            date: formatDate(trips[i].date), // YYYY-MM-DD format
            dateTimestamp: Timestamp.fromDate(trips[i].date), // For optimal sorting
          };

          await tripService.addTrip(tripData);
          results.success++;
        } catch (error) {
          console.error(`Trip ${i + 1} failed:`, error);
          results.failed++;
          failedTrips.push(trips[i]);
          results.errors.push(`Trip ${i + 1}: ${error.message}`);
        }
      }

      if (results.success === trips.length) {
        completedRef.current = true;
        if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current);
        await clearDraft();
        Alert.alert('Success', `All ${results.success} trips added successfully!`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        setTrips(failedTrips);
        setCurrentTripIndex(0);
        await saveDraft({ trips: failedTrips, currentTripIndex: 0 });
        const message = `${results.success} trips saved, ${results.failed} failed.\n${results.errors.join('\n')}`;
        Alert.alert('Partial Success', message);
      }
    } catch (error) {
      console.error('Submit function error:', error);
      Alert.alert('Error', 'Failed to save trips. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  if (!hydrated) return null; // 👈 Wait for hydration before showing anything
  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <Appbar.Header style={{ backgroundColor: colors.primary }}>
          <TouchableOpacity
          onPress={() => navigation.goBack()}
           style={styles.backButtonContainer}
          >
             <Icon name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Appbar.Content title={`Trip ${currentTripIndex + 1} of ${trips.length}`} titleStyle={{ color: '#fff' }} />
          <View style={styles.headerButtons}>
             <Button
              mode="contained"
              compact
              onPress={addTrip}
              buttonColor="#1e40af"
              textColor="#ffffff"
              // contentStyle={styles.headerButtonContent}
              style={styles.headerAddButton}
              labelStyle={styles.headerButtonLabel}
            >
              +
            </Button>
            {trips.length > 1 && (
              <Button
                mode="contained"
                compact
                onPress={() => removeTrip(currentTripIndex)}
                buttonColor="#dc2626"
                textColor="#ffffff"
                contentStyle={styles.headerButtonContent}
                style={styles.headerRemoveButton}
                labelStyle={styles.headerButtonLabel}
              >
                −
              </Button>
            )}
           

          </View>
        </Appbar.Header>

        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          enableOnAndroid={true}
        >
          <ScrollView
            ref={tripsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={screenWidth}
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              const scrollX = event.nativeEvent.contentOffset.x;
              const index = Math.round(scrollX / screenWidth);
              setCurrentTripIndex(Math.min(index, trips.length - 1));
            }}
            scrollEventThrottle={16}
          >
            <View style={styles.tripsContainer}>
              {trips.map((trip, tripIndex) => (
                <Card key={tripIndex} style={[styles.tripCard, { backgroundColor: colors.surface }]}>
                  <Card.Content>


                    <TextInput
                      label="Date *"
                      value={formatDateForDisplay(trip.date)}
                      mode="outlined"
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      theme={{ colors: { onSurfaceVariant: colors.text, color: colors.text, outline: colors.border } }}
                      editable={false}
                      right={<TextInput.Icon icon="calendar" color={colors.primary} onPress={() => showDatePicker(tripIndex)} />}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      selectionColor={colors.primary}
                      textColor={colors.text}
                      placeholderTextColor={colors.textSecondary}
                    />

                    <AutoSuggestInput
                      label="Vehicle Number *"
                      value={trip.vehicleNo}
                      onChangeText={(text) => updateTrip(tripIndex, 'vehicleNo', text)}
                      onSuggestionSelect={(suggestion) => handleVehicleSuggestion(tripIndex, suggestion)}
                      getSuggestions={getVehicleSuggestions}
                      placeholder="Enter vehicle number"
                      autoCapitalize="characters"
                      style={[styles.input, { zIndex: 30, backgroundColor: colors.surface }]}
                      theme={{ colors: { onSurfaceVariant: colors.text, outline: colors.border } }}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      selectionColor={colors.primary}
                      textColor={colors.text}
                      placeholderTextColor={colors.textSecondary}
                    />

                    <AutoSuggestInput
                      label="Driver Name *"
                      value={trip.driverName}
                      onChangeText={(text) => updateTrip(tripIndex, 'driverName', text)}
                      onSuggestionSelect={(suggestion) => handleDriverSuggestion(tripIndex, suggestion)}
                      getSuggestions={getDriverSuggestions}
                      placeholder="Enter driver name"
                      autoCapitalize="characters"
                      style={[styles.input, { zIndex: 20, backgroundColor: colors.surface }]}
                      theme={{ colors: { onSurfaceVariant: colors.text, outline: colors.border } }}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      selectionColor={colors.primary}
                      textColor={colors.text}
                      placeholderTextColor={colors.textSecondary}
                    />

                    <TextInput
                      label="Amount"
                      value={trip.amount}
                      onChangeText={(text) => updateTrip(tripIndex, 'amount', text)}
                      placeholder="Enter amount (optional)"
                      keyboardType="numeric"
                      mode="outlined"
                      style={[styles.input, { zIndex: 1, backgroundColor: colors.surface }]}
                      theme={{ colors: { onSurfaceVariant: colors.text, outline: colors.border } }}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      selectionColor={colors.primary}
                      textColor={colors.text}
                      placeholderTextColor={colors.textSecondary}
                    />

                    {trip.locations.map((location, locationIndex) => (
                      <Card key={locationIndex} style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Card.Content>
                          <View style={styles.locationHeader}>
                            <Title style={[styles.locationTitle, { color: colors.onPrimary, backgroundColor: colors.primary }]}>{locationIndex + 1}</Title>
                            <View style={styles.locationActions}>
                              <Button
                                mode="contained"
                                compact
                                onPress={() => addLocationPair(tripIndex)}
                                buttonColor="#059669"
                                textColor="#ffffff"
                                contentStyle={styles.locationButtonContent}
                                style={styles.addLocationButton}
                                labelStyle={styles.locationButtonLabel}
                              >
                                +
                              </Button>
                              {trip.locations.length > 1 && (
                                <Button
                                  mode="contained"
                                  compact
                                  onPress={() => removeLocationPair(tripIndex, locationIndex)}
                                  buttonColor="#b91c1c"
                                  textColor="#ffffff"
                                  contentStyle={styles.locationButtonContent}
                                  style={styles.removeLocationButton}
                                  labelStyle={styles.locationButtonLabel}
                                >
                                  -
                                </Button>
                              )}


                            </View>
                          </View>

                          <AutoSuggestInput
                            label="From Location *"
                            value={location.from}
                            onChangeText={(text) => handleLocationChange(tripIndex, locationIndex, 'from', text)}
                            onSuggestionSelect={(suggestion) => handleLocationSuggestion(tripIndex, locationIndex, 'from', suggestion)}
                            getSuggestions={getFromLocationSuggestions}
                            placeholder="Enter from location"
                            autoCapitalize="characters"
                            style={[styles.input, { zIndex: 20, backgroundColor: colors.surface }]}
                            theme={{ colors: { onSurfaceVariant: colors.text, outline: colors.border } }}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            selectionColor={colors.primary}
                            textColor={colors.text}
                            placeholderTextColor={colors.textSecondary}
                          />

                          <AutoSuggestInput
                            label="To Location *"
                            value={location.to}
                            onChangeText={(text) => handleLocationChange(tripIndex, locationIndex, 'to', text)}
                            onSuggestionSelect={(suggestion) => handleLocationSuggestion(tripIndex, locationIndex, 'to', suggestion)}
                            onBlur={(value) => handleLocationBlur(tripIndex, locationIndex, 'to', value)}
                            getSuggestions={getCustomerSuggestions}
                            placeholder="Enter to location"
                            autoCapitalize="characters"
                            style={[styles.input, { zIndex: 10, backgroundColor: colors.surface }]}
                            theme={{ colors: { onSurfaceVariant: colors.text, outline: colors.border } }}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            selectionColor={colors.primary}
                            textColor={colors.text}
                            placeholderTextColor={colors.textSecondary}
                          />
                        </Card.Content>
                      </Card>
                    ))}


                  </Card.Content>
                </Card>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.submitContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              loading={loading}
            >
              Submit All Trips
            </Button>
          </View>
        </ScrollView>

        {datePickerState.show && (
          <DateTimePicker
            value={trips[datePickerState.tripIndex]?.date || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        <Portal>
          <Dialog visible={customerDialog.visible} onDismiss={handleCustomerNotFound}>
            <Dialog.Title>Customer Not Found</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                Customer "{customerDialog.customerName}" not found. Please add customer first.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={handleCustomerNotFound}
                textColor="#64748b"
                style={styles.dialogCancelButton}
              >
                Cancel
              </Button>
              <Button
                onPress={navigateToAddCustomer}
                mode="contained"
                buttonColor="#1e40af"
                textColor="#ffffff"
                style={styles.dialogActionButton}
              >
                Add Customer
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tripsContainer: {
    flexDirection: 'row',
    padding: 4,
    gap: 8,
  },
  tripCard: {
    width:  Dimensions.get('window').width - 8,   
    elevation: 3,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,

  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    elevation: 2,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  input: {
    marginVertical: 15,
    position: 'relative',
    zIndex: 10,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  locationCard: {
   
    borderColor: '#d1d5db',
    marginBottom: 16,
    borderWidth: 1,


  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    borderRadius: 5,
    textAlign: 'center',
    minWidth: 28,
    overflow: 'hidden',
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 10,
  },
  headerAddButton: {
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 44,
    height: 32,
  },
  headerRemoveButton: {
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 44,
    height: 32,
  },
  headerButtonContent: {
    height: 32,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonLabel: {
    fontSize: 25,
    fontWeight: '600',
    height: 20,
    marginTop: 6,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
  },
  addLocationButton: {
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    width: 32,
    height: 28,
  },
  removeLocationButton: {
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    width: 32,
    height: 28,
  },
  locationButtonContent: {
    height: 28,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonLabel: {
    fontSize: 20,
    fontWeight: '600',

    paddingVertical: 0,
    marginVertical: 0,
  },
  dialogCancelButton: {
    borderRadius: 6,
    marginRight: 8,
  },
  dialogActionButton: {
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
});

export default TripEntryScreen;
