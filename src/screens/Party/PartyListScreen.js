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
import { useTheme } from '../../hooks/useTheme';

const PartyListScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setLoading(true);
      const mergedData = await vehicleTripService.getPartyTripData();
      setParties(mergedData);
    } catch (error) {
      console.error('Error loading parties:', error);
      Alert.alert('Error', 'Failed to load parties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderParty = ({ item }) => (
    <TouchableOpacity 
      style={[styles.partyCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('PartyList_Details_Screen', { from: item.from })}
    >
      <View style={styles.partyHeader}>
        <Text style={[styles.partyName, { color: colors.text }]}>{item.from || 'N/A'}</Text>
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

      {parties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No parties found</Text>
        </View>
      ) : (
        <FlatList
          data={parties}
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