import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigate, useLocation } from 'react-router-native';
import { vehicleTripService } from '../../config/firebase';
import TripListExport from '../../components/Pdf_Excel_calender_Sort';
import {getFirestore, getDoc, deleteDoc, updateDoc, doc, increment, limit, startAfter } from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../hooks/useTheme';

const TripList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxLocations, setMaxLocations] = useState(2);
  const [searchText, setSearchText] = useState('');
  const [displayedTrips, setDisplayedTrips] = useState([]);

  // Create stable callback function
  const handleDataChange = useCallback((newData) => {
    console.log('📨 TripList Screen received data:', newData.length, 'trips');
    setDisplayedTrips(newData);
  }, []);

  const handleEdit = (trip) => {
    navigate('/edit-trip', { state: { tripId: trip.id } });
  };

  const handleDelete = (tripId) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get trip data first to access locations
              const db = getFirestore();
              const tripDocRef = doc(db, 'tripEntries', tripId);
              const tripDoc = await getDoc(tripDocRef);
              const tripData = tripDoc.data();
             // console.log('Trip data:', tripData);
              const vehicleNo = tripData?.vehicleNo;
            //  console.log('Vehicle no:', vehicleNo);
              await deleteDoc(tripDocRef);
              
              // Decrease loadCount in vehicles collection
              const vehicleDocRef = doc(db, 'vehicles', vehicleNo);
              await updateDoc(vehicleDocRef, {
                loadCount: increment(-1)
              });

              // Decrease loadCount in parties collection for each location
              if (tripData?.locations) {
                for (const location of tripData.locations) {
                  if (location.to) {
                    try {
                      const partyDocRef = doc(db, 'parties', location.to);
                      const partyDoc = await getDoc(partyDocRef);
                      if (partyDoc.exists()) {
                        await updateDoc(partyDocRef, {
                          loadCount: increment(-1)
                        });
                      }
                    } catch (partyError) {
                      console.warn(`Error updating party ${location.to}:`, partyError);
                      // Continue with other locations even if one fails
                    }
                  }
                }
              }
              
              await loadTrips();
              Alert.alert('Success', 'Trip deleted successfully');
            } catch (error) {
              console.error('Error deleting trip:', error);
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ]
    );
  };

  const keyExtractor = useCallback((item) => item.id, []);

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredTrips(trips);
    } else {
      const filtered = trips.filter(trip =>
        trip.vehicleNo.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredTrips(filtered);
    }
  }, [trips]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const mergedData = await vehicleTripService.getVehicleTripsData();

      // Find maximum number of locations
      const maxLocs = Math.max(...mergedData.map(item => item.locations?.length || 0), 2);
      setMaxLocations(maxLocs);

      const processedData = mergedData.map((item, index) => {
        const processedItem = {
          ...item,
          srNo: index + 1,
          date: item.date || 'N/A',
          dateTimestamp: item.dateTimestamp || null, // Add timestamp field
          vehicleNo: item.vehicleNo || 'N/A',
          driverName: item.driverName || 'N/A',
          loadCount: item.loadCount || 0,
          createdAt: item.createdAt || null,
        };

        // Add dynamic location fields
        for (let i = 0; i < maxLocs; i++) {
          processedItem[`from${i + 1}`] = item.locations?.[i]?.from || (i === 0 ? 'N/A' : '');
          processedItem[`to${i + 1}`] = item.locations?.[i]?.to || (i === 0 ? 'N/A' : '');
        }

        return processedItem;
      });

      setTrips(processedData);
      setFilteredTrips(processedData);
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    // Reload trips when screen comes into focus (route changes)
    if (location.pathname === '/trip-list') {
      loadTrips();
    }
  }, [location.pathname]);

  useEffect(() => {
    // Update displayed trips when filteredTrips changes
    console.log('🔄 TripList Screen: filteredTrips changed:', filteredTrips.length);
    setDisplayedTrips(filteredTrips);
  }, [filteredTrips]);

  const renderHeader = useCallback(() => {
    const locationHeaders = [];
    for (let i = 0; i < maxLocations; i++) {
      locationHeaders.push(
        <Text key={`from${i}`} style={[styles.cell, styles.locationCell, styles.headerText]}>
          {i === 0 ? 'From' : `From${i + 1}`}
        </Text>
      );
      locationHeaders.push(
        <Text key={`to${i}`} style={[styles.cell, styles.locationCell, styles.headerText]}>
          {i === 0 ? 'To' : `To${i + 1}`}
        </Text>
      );
    }

    return (
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.srCell, styles.headerText]}>Sr</Text>
        <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Date</Text>
        <Text style={[styles.cell, styles.vehicleCell, styles.headerText]}>Vehicle</Text>
        <Text style={[styles.cell, styles.driverCell, styles.headerText]}>Driver</Text>
        {locationHeaders}
        <Text style={[styles.cell, styles.loadCell, styles.headerText]}>Load</Text>
        <Text style={[styles.cell, styles.createdCell, styles.headerText]}>Created</Text>
        <Text style={[styles.cell, styles.actionCell, styles.headerText]}>Actions</Text>
      </View>
    );
  }, [maxLocations]);

  const renderTrip = useCallback(({ item, index }) => {
    const locationCells = [];
    for (let i = 0; i < maxLocations; i++) {
      locationCells.push(
        <Text key={`from${i}`} style={[styles.cell, styles.locationCell]} numberOfLines={1}>
          {item[`from${i + 1}`]}
        </Text>
      );
      locationCells.push(
        <Text key={`to${i}`} style={[styles.cell, styles.locationCell]} numberOfLines={1}>
          {item[`to${i + 1}`]}
        </Text>
      );
    }

    return (
      <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
        <Text style={[styles.cell, styles.srCell]}>{item.srNo}</Text>
        <Text style={[styles.cell, styles.dateCell]} numberOfLines={1}>{item.date}</Text>
        <Text style={[styles.cell, styles.vehicleCell]} numberOfLines={1}>{item.vehicleNo}</Text>
        <Text style={[styles.cell, styles.driverCell]} numberOfLines={1}>{item.driverName}</Text>
        {locationCells}
        <Text style={[styles.cell, styles.loadCell]}>{item.loadCount}</Text>
        <Text style={[styles.cell, styles.createdCell]} numberOfLines={2}>
          {item.createdAt ? item.createdAt.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'N/A'}
        </Text>
        <View style={[styles.cell, styles.actionCell]}>
          <TouchableOpacity style={styles.cell} onPress={() => handleEdit(item)}>
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cell} onPress={() => handleDelete(item.id)}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [maxLocations, handleEdit, handleDelete]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {/* Export Buttons */}
        <TripListExport 
          data={filteredTrips} 
          onDataChange={(newData) => {
            console.log('📨 DIRECT CALLBACK TripList Screen received data:', newData.length, 'trips');
            setDisplayedTrips(newData);
          }}
        />
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by Vehicle No..."
            value={searchText}
            onChangeText={handleSearch}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {displayedTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No trips found</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableContainer}>
            <FlatList
              data={displayedTrips}
              renderItem={renderTrip}
              keyExtractor={keyExtractor}
              ListHeaderComponent={renderHeader}
              stickyHeaderIndices={[0]}
              refreshing={loading}
              onRefresh={loadTrips}
              removeClippedSubviews={true}
              maxToRenderPerBatch={20}
              windowSize={5}
              initialNumToRender={20}
              getItemLayout={(data, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  tableContainer: {
    minWidth: 980,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRight: {
    width: 60,
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerRow: {
    backgroundColor: '#343a40',
    borderBottomWidth: 2,
    borderBottomColor: '#495057',
  },
  evenRow: {
    backgroundColor: '#ffffff',
  },
  oddRow: {
    backgroundColor: '#f8f9fa',
  },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 11,
    color: '#495057',
    textAlign: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#ffffff',
    fontSize: 10,
  },
  srCell: {
    width: 50,
  },
  dateCell: {
    width: 90,
  },
  vehicleCell: {
    width: 80,
  },
  driverCell: {
    width: 100,
  },
  locationCell: {
    width: 90,
  },
  loadCell: {
    width: 60,
  },
  createdCell: {
    width: 120,
  },
  actionCell: {
    width: 110,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

export default TripList;