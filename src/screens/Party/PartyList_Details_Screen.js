import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

const PartyList_Details_Screen = ({ navigation, route }) => {
  const { from } = route.params;
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxLocations, setMaxLocations] = useState(0);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const querySnapshot = await firestore()
        .collection('tripEntries')
        .orderBy('createdAt', 'desc')
        .get();

      // Filter trips that have the party name in any location's from field
      const filteredDocs = querySnapshot.docs.filter(doc => {
        const locations = doc.data().locations || [];
        return locations.some(loc => loc.from === from);
      });

      const tripsData = filteredDocs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          srNo: index + 1,
          date: data.date || 'N/A',
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
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (trip) => {
    navigation.navigate('TripEntry', { editTrip: trip });
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
              await firestore().collection('tripEntries').doc(tripId).delete();
              loadTrips();
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

  const renderRow = ({ item, index }) => (
    <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
      <Text style={styles.cell}>{item.srNo}</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Party: {from}</Text>
        <View style={styles.headerRight} />
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trips found</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FlatList
            data={trips}
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
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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

export default PartyList_Details_Screen;