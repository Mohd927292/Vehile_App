import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { vehicleTripService } from '../../config/firebase';

const VehicleList = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const renderVehicle = ({ item }) => (
    <TouchableOpacity 
      style={styles.vehicleCard}
      onPress={() => navigation.navigate('Vehicle_list_Screen', { vehicleNo: item.vehicleNo })}
    >
      <View style={styles.vehicleHeader}>
        <Text style={styles.vehicleNumber}>{item.vehicleNo || 'N/A'}</Text>
      </View>
      
      <Text style={styles.vehicleInfo}>Load Count: {item.loadCount || 'N/A'}</Text>
      <Text style={styles.vehicleInfo}>Last Trip: {item.createdAt ? item.createdAt.toLocaleString() : 'N/A'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicles</Text>
        <View style={styles.headerRight} />
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vehicles found</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
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
  listContent: {
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: 'white',
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
    color: '#333',
  },
  vehicleInfo: {
    color: '#555',
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
    color: '#666',
  },
});

export default VehicleList;
