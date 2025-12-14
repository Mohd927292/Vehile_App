import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Appbar,
  Provider as PaperProvider,
  IconButton,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

import { tripService } from '../../config/firebase';

const TripEntryScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([{
    vehicleNo: '',
    driverName: '',
    locations: [{ from: '', to: '' }],
    date: new Date(),
  }]);
  const [loading, setLoading] = useState(false);
  const [datePickerState, setDatePickerState] = useState({ show: false, tripIndex: -1 });
  const [currentTripIndex, setCurrentTripIndex] = useState(0);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB');
  };

  const showDatePicker = (tripIndex) => {
    setDatePickerState({ show: true, tripIndex });
  };

  const onDateChange = (event, selectedDate) => {
    setDatePickerState({ show: false, tripIndex: -1 });
    if (selectedDate && datePickerState.tripIndex >= 0) {
      const newTrips = [...trips];
      newTrips[datePickerState.tripIndex].date = selectedDate;
      setTrips(newTrips);
    }
  };

  const addTrip = () => {
    setTrips([...trips, {
      vehicleNo: '',
      driverName: '',
      locations: [{ from: '', to: '' }],
      date: new Date(),
    }]);
  };

  const removeTrip = (tripIndex) => {
    if (trips.length > 1) {
      setTrips(trips.filter((_, i) => i !== tripIndex));
    }
  };

  const updateTrip = (tripIndex, field, value) => {
    const newTrips = [...trips];
    newTrips[tripIndex][field] = value;
    setTrips(newTrips);
  };

  const addLocationPair = (tripIndex) => {
    const newTrips = [...trips];
    newTrips[tripIndex].locations.push({ from: '', to: '' });
    setTrips(newTrips);
  };

  const removeLocationPair = (tripIndex, locationIndex) => {
    const newTrips = [...trips];
    if (newTrips[tripIndex].locations.length > 1) {
      newTrips[tripIndex].locations = newTrips[tripIndex].locations.filter((_, i) => i !== locationIndex);
      setTrips(newTrips);
    }
  };

  const updateLocation = (tripIndex, locationIndex, field, value) => {
    const newTrips = [...trips];
    newTrips[tripIndex].locations[locationIndex][field] = value;
    setTrips(newTrips);
  };

  const validateTrip = (trip, tripIndex) => {
    if (!trip.vehicleNo.trim()) {
      return `Vehicle number is required for trip ${tripIndex + 1}`;
    }
    if (!trip.driverName.trim()) {
      return `Driver name is required for trip ${tripIndex + 1}`;
    }
    for (let i = 0; i < trip.locations.length; i++) {
      if (!trip.locations[i].from.trim()) {
        return `From location is required for trip ${tripIndex + 1}, pair ${i + 1}`;
      }
      if (!trip.locations[i].to.trim()) {
        return `To location is required for trip ${tripIndex + 1}, pair ${i + 1}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    console.log('=== SUBMIT STARTED ===');
    console.log('Total trips to submit:', trips.length);
    
    // Validate all trips
    for (let i = 0; i < trips.length; i++) {
      const error = validateTrip(trips[i], i);
      if (error) {
        console.log('Validation failed for trip', i + 1, ':', error);
        Alert.alert('Validation Error', error);
        return;
      }
    }
    console.log('All trips validated successfully');

    setLoading(true);
    const results = { success: 0, failed: 0, errors: [] };

    try {
      for (let i = 0; i < trips.length; i++) {
        try {
          const tripData = {
            vehicleNo: trips[i].vehicleNo.toUpperCase().trim(),
            driverName: trips[i].driverName.trim(),
            locations: trips[i].locations.map(loc => ({
              from: loc.from.trim(),
              to: loc.to.trim()
            })),
            date: formatDate(trips[i].date),
          };

          console.log(`Submitting trip ${i + 1}:`, JSON.stringify(tripData, null, 2));
          await tripService.addTrip(tripData);
          console.log(`Trip ${i + 1} saved successfully`);
          results.success++;
        } catch (error) {
          console.error(`Trip ${i + 1} failed:`, error);
          console.error('Error details:', error.message, error.code, error.stack);
          results.failed++;
          results.errors.push(`Trip ${i + 1}: ${error.message}`);
        }
      }

      console.log('Final results:', results);
      if (results.success === trips.length) {
        Alert.alert('Success', `All ${results.success} trips added successfully!`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const message = `${results.success} trips saved, ${results.failed} failed.\n${results.errors.join('\n')}`;
        Alert.alert('Partial Success', message);
      }
    } catch (error) {
      console.error('Submit function error:', error);
      console.error('Error details:', error.message, error.code, error.stack);
      Alert.alert('Error', 'Failed to save trips. Please try again.');
    } finally {
      setLoading(false);
      console.log('=== SUBMIT ENDED ===');
    }
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`Trip ${currentTripIndex + 1} of ${trips.length}`} />
        <Button 
          mode="contained" 
          compact 
          onPress={addTrip}
          buttonColor="#10b981"
          textColor="#ffffff"
          style={{ borderRadius: 12, elevation: 4 }}
        >
          +
        </Button>
        {trips.length > 1 && (
          <Button 
            mode="contained" 
            compact 
            onPress={() => removeTrip(trips.length - 1)}
            buttonColor="#ef4444"
            textColor="#ffffff"
            style={{ borderRadius: 12, elevation: 4, marginLeft: 8 }}
          >
            -
          </Button>
        )}
      </Appbar.Header>
      
      <ScrollView style={styles.container}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToInterval={344}
          decelerationRate="fast"
          onScroll={(event) => {
            const scrollX = event.nativeEvent.contentOffset.x;
            const index = Math.round(scrollX / 344);
            setCurrentTripIndex(Math.min(index, trips.length - 1));
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.tripsContainer}>
            {trips.map((trip, tripIndex) => (
              <Card key={tripIndex} style={styles.tripCard}>
              <Card.Content>


                <TextInput
                  label="Date *"
                  value={formatDate(trip.date)}
                  mode="outlined"
                  style={styles.input}
                  editable={false}
                  right={<TextInput.Icon icon="calendar" onPress={() => showDatePicker(tripIndex)} />}
                />

                <TextInput
                  label="Vehicle Number *"
                  value={trip.vehicleNo}
                  onChangeText={(text) => updateTrip(tripIndex, 'vehicleNo', text)}
                  placeholder="Enter vehicle number"
                  autoCapitalize="characters"
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Driver Name *"
                  value={trip.driverName}
                  onChangeText={(text) => updateTrip(tripIndex, 'driverName', text)}
                  placeholder="Enter driver name"
                  autoCapitalize="words"
                  mode="outlined"
                  style={styles.input}
                />

                {trip.locations.map((location, locationIndex) => (
                  <Card key={locationIndex} style={styles.locationCard}>
                    <Card.Content>
                      <View style={styles.locationHeader}>
                        <Title style={styles.locationTitle}>{locationIndex + 1}</Title>
                        <View style={styles.locationActions}>
                          <Button 
                            mode="contained" 
                            compact 
                            onPress={() => addLocationPair(tripIndex)}
                            buttonColor="#3b82f6"
                            textColor="#ffffff"
                            style={{ borderRadius: 20, minWidth: 36, height: 36 }}
                          >
                            +
                          </Button>
                          {trip.locations.length > 1 && (
                            <Button 
                              mode="contained" 
                              compact 
                              onPress={() => removeLocationPair(tripIndex, locationIndex)}
                              buttonColor="#f59e0b"
                              textColor="#ffffff"
                              style={{ borderRadius: 20, minWidth: 36, height: 36 }}
                            >
                              -
                            </Button>
                          )}
                        </View>
                      </View>
                      
                      <TextInput
                        label="From Location *"
                        value={location.from}
                        onChangeText={(text) => updateLocation(tripIndex, locationIndex, 'from', text)}
                        placeholder="Enter from location"
                        autoCapitalize="words"
                        mode="outlined"
                        style={styles.input}
                      />

                      <TextInput
                        label="To Location *"
                        value={location.to}
                        onChangeText={(text) => updateLocation(tripIndex, locationIndex, 'to', text)}
                        placeholder="Enter to location"
                        autoCapitalize="words"
                        mode="outlined"
                        style={styles.input}
                      />
                    </Card.Content>
                  </Card>
                ))}


              </Card.Content>
            </Card>
            ))}
          </View>
        </ScrollView>
        
        <View style={styles.submitContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitButton}
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
      </KeyboardAvoidingView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  tripsContainer: {
    flexDirection: 'row',
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  tripCard: {
    width: 320,
    marginHorizontal: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  submitContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  input: {
    marginBottom: 18,
    backgroundColor: '#fafafa',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  locationCard: {
    marginBottom: 20,
    backgroundColor: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    textAlign: 'center',
    minWidth: 32,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default TripEntryScreen;