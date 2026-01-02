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
import firestore, { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc, deleteDoc, updateDoc, increment } from '@react-native-firebase/firestore';
import TripListExport from '../../components/Pdf_Excel_calender_Sort';
import { getRouteParams, navigateWithParams } from '../../utils/navigation';

const Vehicle_list_Screen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vehicleNo } = getRouteParams(location);
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxLocations, setMaxLocations] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [displayedTrips, setDisplayedTrips] = useState([]);

  // Create stable callback function
  const handleDataChange = useCallback((newData) => {
    console.log('📨 Vehicle Screen received data:', newData.length, 'trips');
    setDisplayedTrips(newData);
  }, []);

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    // Update displayed trips when filteredTrips changes
    console.log('🔄 Vehicle Screen: filteredTrips changed:', filteredTrips.length);
    setDisplayedTrips(filteredTrips);
  }, [filteredTrips]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const q = query(
        collection(db, 'tripEntries'),
        where('vehicleNo', '==', vehicleNo),
        orderBy('createdAt', 'desc'),
        limit(1000)
      );
      const querySnapshot = await getDocs(q);

      const tripsData = querySnapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          srNo: index + 1,
          date: data.date || 'N/A',
          dateTimestamp: data.dateTimestamp || null, // Add timestamp field
          vehicleNo: data.vehicleNo || 'N/A',
          driverName: data.driverName || 'N/A',
          locations: data.locations || [],
          loadCount: data.loadCount || 'N/A',
          createdAt: data.createdAt?.toDate() || null,
        };
      });

      const maxLoc = Math.max(...tripsData.map(trip => trip.locations.length), 0);
      setMaxLocations(maxLoc);
      setTrips(tripsData);
      // Reapply search filter if there's an active search query
      filterTrips(searchQuery, tripsData);
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (trip) => {
    navigateWithParams(navigate, '/edit-trip', { tripId: trip.id });
  };

  const filterTrips = (query, tripsToFilter = null) => {
    const tripsData = tripsToFilter || trips;
    if (!query.trim()) {
      setFilteredTrips(tripsData);
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const filtered = tripsData.filter(trip => {
      // Search in vehicle number
      const matchesVehicle = trip.vehicleNo?.toLowerCase().includes(lowerQuery);
      
      // Also search in other fields
      const matchesDriver = trip.driverName?.toLowerCase().includes(lowerQuery);
      const matchesDate = trip.date?.toLowerCase().includes(lowerQuery);
      const matchesLoadCount = trip.loadCount?.toString().toLowerCase().includes(lowerQuery);
      
      // Search in party names (from/to fields in locations)
      const hasMatchingParty = trip.locations.some(loc => 
        loc.from?.toLowerCase().includes(lowerQuery) ||
        loc.to?.toLowerCase().includes(lowerQuery)
      );

      return matchesVehicle || matchesDriver || matchesDate || matchesLoadCount || hasMatchingParty;
    });

    setFilteredTrips(filtered);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    filterTrips(text);
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

  const generateColumns = () => {
    const baseColumns = ['Sr No', 'Date', 'Vehicle No', 'Driver Name'];
    const locationColumns = [];
    
    for (let i = 1; i <= maxLocations; i++) {
      locationColumns.push(`From${i}`, `To${i}`);
    }
    
    return [...baseColumns, ...locationColumns, 'Load Count', 'Created At', 'Edit', 'Delete'];
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      {generateColumns().map((column, index) => (
        <Text key={index} style={styles.headerCell}>
          {column}
        </Text>
      ))}
    </View>
  );

  const renderRow = ({ item, index }) => {
    // Recalculate srNo based on filtered list index
    const displaySrNo = index + 1;
    return (
    <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
      <Text style={styles.cell}>{displaySrNo}</Text>
      <Text style={styles.cell}>{item.date}</Text>
      <Text style={styles.cell}>{item.vehicleNo}</Text>
      <Text style={styles.cell}>{item.driverName}</Text>
      
      {Array.from({ length: maxLocations }, (_, i) => {
        const location = item.locations[i];
        return [
          <Text key={`from-${i}`} style={styles.cell}>
            {location?.from || 'N/A'}
          </Text>,
          <Text key={`to-${i}`} style={styles.cell}>
            {location?.to || 'N/A'}
          </Text>
        ];
      }).flat()}
      
      <Text style={styles.cell}>{item.loadCount}</Text>
      <Text style={styles.cell}>
        {item.createdAt ? item.createdAt.toLocaleString() : 'N/A'}
      </Text>
      
      <TouchableOpacity style={styles.cell} onPress={() => handleEdit(item)}>
        <Text style={styles.actionIcon}>✏️</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cell} onPress={() => handleDelete(item.id)}>
        <Text style={styles.actionIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
    );
  };

  const getItemLayout = (data, index) => ({
    length: 60,
    offset: 60 * index,
    index,
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{vehicleNo}</Text>
        {console.log('🚨 PARENT DEBUG - About to render TripListExport with props:', {
          data: filteredTrips,
          onDataChange: (newData) => {
            console.log('📨 DIRECT CALLBACK Vehicle Screen received data:', newData.length, 'trips');
            setDisplayedTrips(newData);
          }
        })}
        <TripListExport 
          data={filteredTrips} 
          onDataChange={(newData) => {
            console.log('📨 DIRECT CALLBACK Vehicle Screen received data:', newData.length, 'trips');
            setDisplayedTrips(newData);
          }}
        />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vehicle number, driver, date, party..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {displayedTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trips found</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FlatList
            data={displayedTrips}
            renderItem={renderRow}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderHeader}
            getItemLayout={getItemLayout}
            windowSize={10}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#1976d2',
    elevation: 4,
  },
  headerRight: {
    width: 60,
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    letterSpacing: 0.5,
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 12,
  },
  headerCell: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    width: 100,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    minHeight: 60,
    alignItems: 'center',
  },
  evenRow: {
    backgroundColor: 'white',
  },
  oddRow: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    fontSize: 12,
    textAlign: 'center',
    width: 100,
    paddingHorizontal: 8,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  actionIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default Vehicle_list_Screen;