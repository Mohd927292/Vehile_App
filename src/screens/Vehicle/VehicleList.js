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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { vehicleTripService } from '../../config/firebase';
import { useTheme } from '../../hooks/useTheme';

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
        const key = trip.vehicleNo;
        if (!key) return;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            vehicleNo: trip.vehicleNo,
            loadCount: 1,
            createdAt: trip.createdAt,
          });
        } else {
          vehicleMap.get(key).loadCount += 1;
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
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButtonContainer}
        >
          <Icon name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Icon name="car" size={24} color="#fff" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Vehicles</Text>
          </View>
          <Text style={styles.headerSubtitle}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered</Text>
        </View>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    paddingBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerRight: {
    width: 44,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
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
