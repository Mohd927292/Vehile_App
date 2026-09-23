import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { tripEntriesCollection, tripService } from '../../config/firebase';
import { getDocs, query, orderBy } from '@react-native-firebase/firestore';
import TripListExport from '../../components/Pdf_Excel_calender_Sort';
import TripCard from '../../components/TripCard';
import { matchingPartyLocations, filterTripsByQuery } from '../../utils/tripData';

const PartyList_Details_Screen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const to = route.params?.to;
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef('');

  const [displayedTrips, setDisplayedTrips] = useState([]);

  // Create stable callback function
  const handleDataChange = useCallback((newData) => {
    setDisplayedTrips(newData);
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(tripEntriesCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      // Filter trips that have the party name in any location's to field
      const filteredDocs = querySnapshot.docs.filter(doc => {
        const locations = doc.data().locations || [];
        return matchingPartyLocations({ locations }, to).length > 0;
      });

      const tripsData = filteredDocs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          srNo: index + 1,
          date: data.date || 'N/A',
          dateTimestamp: data.dateTimestamp || null, // Add timestamp field
          vehicleNo: data.vehicleNo || 'N/A',
          driverName: data.driverName || 'N/A',
          amount: (data.locations || []).length === matchingPartyLocations(data, to).length && data.amount != null
            ? data.amount.toString() : 'Shared trip',
          locations: matchingPartyLocations(data, to),
          loadCount: matchingPartyLocations(data, to).length,
          createdAt: data.createdAt?.toDate() || null,
        };
      });

      setTrips(tripsData);
      // Reapply search filter if there's an active search query
      setFilteredTrips(filterTripsByQuery(tripsData, searchRef.current));
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [to]);

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  const handleEdit = (trip) => {
    navigation.navigate('EditTrip', { tripId: trip.id });
  };

  const filterTrips = (query, tripsToFilter = null) => {
    setFilteredTrips(filterTripsByQuery(tripsToFilter || trips, query));
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    searchRef.current = text;
    filterTrips(text);
  };

  const handleDelete = (tripId) => {
    Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await tripService.deleteTrip(tripId);
            await loadTrips();
            Alert.alert('Success', 'Trip deleted successfully');
          } catch (error) {
            Alert.alert('Error', error.message || 'Failed to delete trip');
          }
        },
      },
    ]);
  };

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
        <Text style={styles.headerTitle}>{to}</Text>
        <TripListExport 
          data={filteredTrips} 
          onDataChange={handleDataChange}
        />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by party name, vehicle, driver, date..."
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
        <FlatList
          data={displayedTrips}
          renderItem={({ item }) => <TripCard trip={item} onEdit={handleEdit} onDelete={handleDelete} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={loadTrips}
          refreshing={loading}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
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
    color: 'white',
    fontSize: 18,
    letterSpacing: 0.5,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default PartyList_Details_Screen;
