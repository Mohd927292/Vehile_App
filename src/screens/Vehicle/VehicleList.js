import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { vehicleTripService } from '../../config/firebase';
import { useTheme } from '../../hooks/useTheme';
import { navigateWithParams } from '../../utils/navigation';

const VehicleList = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const mergedData = await vehicleTripService.getVehicleTripsData();
      
      // Group by vehicle and get unique vehicles
      const vehicleMap = new Map();
      mergedData.forEach(trip => {
        if (!vehicleMap.has(trip.vehicleNo)) {
          vehicleMap.set(trip.vehicleNo, {
            vehicleNo: trip.vehicleNo,
          
            loadCount: trip.loadCount,
            createdAt: trip.createdAt
          });
        }
      });
      
      setVehicles(Array.from(vehicleMap.values()));
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderVehicle = ({ item }) => (
    <TouchableOpacity 
      style={[styles.vehicleCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('VehicleDetails', { vehicleNo: item.vehicleNo })}
    >
      <View style={styles.vehicleHeader}>
        <Text style={[styles.vehicleNumber, { color: colors.text }]}>{item.vehicleNo || 'N/A'}</Text>
      </View>
      
      <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>Load Count: {item.loadCount || 'N/A'}</Text>
      <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>Last Trip: {item.createdAt ? item.createdAt.toLocaleString() : 'N/A'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicles</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Search vehicles..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No vehicles found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicle}
          keyExtractor={item => item.vehicleNo}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadVehicles}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerRight: {
    width: 60, // Same as back button for alignment
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    elevation: 2,
  },
  listContent: {
    padding: 16,
  },
  vehicleCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vehicleInfo: {
    marginBottom: 8,
  },
  routesContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  routesTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#444',
  },
  routeItem: {
    marginBottom: 4,
  },
  routeText: {
    color: '#666',
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

export default VehicleList;
