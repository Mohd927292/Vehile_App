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

const PartyListScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setLoading(true);
      
      // Get all trips and build parties from TO locations
      const tripsSnapshot = await vehicleTripService.getVehicleTripsData();
      
      // Extract all TO locations and count them
      const partyMap = new Map();
      
      tripsSnapshot.forEach(trip => {
        if (trip.locations && trip.locations.length > 0) {
          trip.locations.forEach(location => {
            if (location.to) {
              const partyName = location.to;
              if (partyMap.has(partyName)) {
                partyMap.set(partyName, {
                  ...partyMap.get(partyName),
                  loadCount: partyMap.get(partyName).loadCount + 1
                });
              } else {
                partyMap.set(partyName, {
                  id: partyName,
                  to: partyName,
                  loadCount: 1,
                  createdAt: trip.createdAt
                });
              }
            }
          });
        }
      });
      
      setParties(Array.from(partyMap.values()));
    } catch (error) {
      console.error('Error loading parties:', error);
      Alert.alert('Error', 'Failed to load parties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(party =>
    party.to.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderParty = ({ item }) => (
    <TouchableOpacity 
      style={[styles.partyCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('PartyDetails', { to: item.to })}
    >
      <View style={styles.partyHeader}>
        <Text style={[styles.partyName, { color: colors.text }]}>{item.to || 'N/A'}</Text>
      </View>
      <Text style={[styles.partyInfo, { color: colors.textSecondary }]}>Load: {item.loadCount }</Text>
      <Text style={[styles.partyInfo, { color: colors.textSecondary }]}>CreatedAt: {item.createdAt ? item.createdAt.toLocaleString() : 'N/A'}</Text>
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
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parties</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Search parties..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {parties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No parties found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredParties}
          renderItem={renderParty}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadParties}
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
  partyCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  partyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  partyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  partyInfo: {
    marginBottom: 8,
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

export default PartyListScreen;