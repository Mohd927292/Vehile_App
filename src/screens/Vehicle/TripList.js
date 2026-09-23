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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { vehicleTripService, tripService } from '../../config/firebase';
import TripListExport from '../../components/Pdf_Excel_calender_Sort';
import TripCard from '../../components/TripCard';
import { useTheme } from '../../hooks/useTheme';
import { filterTripsByQuery } from '../../utils/tripData';

const TripList = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef('');
  const [displayedTrips, setDisplayedTrips] = useState([]);

  // Create stable callback function
  const handleDataChange = useCallback((newData) => {
    setDisplayedTrips(newData);
  }, []);

  const handleEdit = (trip) => {
    navigation.navigate('EditTrip', { tripId: trip.id });
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

  const keyExtractor = useCallback((item) => item.id, []);

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    searchRef.current = text;
    setFilteredTrips(filterTripsByQuery(trips, text));
  }, [trips]);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const mergedData = await vehicleTripService.getVehicleTripsData();

      const processedData = mergedData.map((item, index) => {
      
        const processedItem = {
          ...item,
          srNo: index + 1,
          date: item.date || 'N/A',
          dateTimestamp: item.dateTimestamp || null, // Add timestamp field
          vehicleNo: item.vehicleNo || 'N/A',
          driverName: item.driverName || 'N/A',
          amount: item.amount !== undefined && item.amount !== null ? item.amount.toString() : '',
          loadCount: item.loadCount || 0,
          createdAt: item.createdAt || null,
        };

        return processedItem;
      });

      setTrips(processedData);
      setFilteredTrips(filterTripsByQuery(processedData, searchRef.current));
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

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
          onDataChange={handleDataChange}
        />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search vehicles, parties, drivers, dates..."
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
        <FlatList
          data={displayedTrips}
          renderItem={({ item }) => <TripCard trip={item} onEdit={handleEdit} onDelete={handleDelete} />}
          keyExtractor={keyExtractor}
          refreshing={loading}
          onRefresh={loadTrips}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={12}
          windowSize={5}
          initialNumToRender={12}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
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
