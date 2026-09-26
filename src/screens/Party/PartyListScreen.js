import React, { useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { vehicleTripService } from '../../config/firebase';
import { useTheme } from '../../hooks/useTheme';
import { partyKey, parseTripDate } from '../../utils/tripData';

const PartyListScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadParties = useCallback(async () => {
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
              const partyName = location.to.replace(/\s+/g, ' ').trim();
              const key = partyKey(partyName);
              if (partyMap.has(key)) {
                partyMap.set(key, {
                  ...partyMap.get(key),
                  loadCount: partyMap.get(key).loadCount + 1
                });
              } else {
                partyMap.set(key, {
                  id: key,
                  to: partyName,
                  loadCount: 1,
                  createdAt: trip.createdAt || parseTripDate(trip.date)
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
  }, []);

  useFocusEffect(useCallback(() => { loadParties(); }, [loadParties]));

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
      <Text style={[styles.partyInfo, { color: colors.textSecondary }]}>Last Trip: {item.createdAt ? item.createdAt.toLocaleString() : 'N/A'}</Text>
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
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButtonContainer}
        >
          <Icon name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Icon name="briefcase-outline" size={24} color="#fff" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Parties</Text>
          </View>
          <Text style={styles.headerSubtitle}>{parties.length} part{parties.length !== 1 ? 'ies' : 'y'} registered</Text>
        </View>
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

      {filteredParties.length === 0 ? (
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
