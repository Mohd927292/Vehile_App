// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   FlatList,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { tripService } from '../../config/firebase';

// const PartyDetailScreen = ({ route, navigation }) => {
//   const { from } = route.params;
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadTrips();
//   }, []);

//   const loadTrips = async () => {
//     try {
//       setLoading(true);
//       const tripsData = await tripService.getTripsByParty(from);
//       setTrips(tripsData);
//     } catch (error) {
//       console.error('Error loading trips:', error);
//       Alert.alert('Error', 'Failed to load trips. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderTrip = ({ item }) => (
//     <View style={styles.tripCard}>
//       <View style={styles.tripHeader}>
//         <Text style={styles.vehicleNo}>{item.vehicleNo}</Text>
//         <Text style={styles.tripDate}>{item.date}</Text>
//       </View>
//       <Text style={styles.driverName}>Driver: {item.driverName}</Text>
//       <View style={styles.routeContainer}>
//         <Text style={styles.routeText}>
//           {item.from} → {item.to}
//         </Text>
//       </View>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#1976d2" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Text style={styles.backButton}>← Back</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>{from}</Text>
//         <View style={styles.headerRight} />
//       </View>

//       <View style={styles.statsContainer}>
//         <Text style={styles.statsText}>Total Loads: {trips.length}</Text>
//       </View>

//       {trips.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <Text style={styles.emptyText}>No trips found for this party</Text>
//         </View>
//       ) : (
//         <FlatList
//           data={trips}
//           renderItem={renderTrip}
//           keyExtractor={item => item.id}
//           contentContainerStyle={styles.listContent}
//           refreshing={loading}
//           onRefresh={loadTrips}
//         />
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     paddingTop: 50,
//     backgroundColor: '#1976d2',
//     elevation: 4,
//   },
//   headerRight: {
//     width: 60,
//   },
//   backButton: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   headerTitle: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   statsContainer: {
//     backgroundColor: 'white',
//     padding: 16,
//     margin: 16,
//     borderRadius: 8,
//     elevation: 2,
//   },
//   statsText: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//     textAlign: 'center',
//   },
//   listContent: {
//     padding: 16,
//   },
//   tripCard: {
//     backgroundColor: 'white',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 12,
//     elevation: 2,
//   },
//   tripHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 8,
//   },
//   vehicleNo: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   tripDate: {
//     fontSize: 14,
//     color: '#666',
//     fontWeight: '500',
//   },
//   driverName: {
//     fontSize: 14,
//     color: '#555',
//     marginBottom: 8,
//   },
//   routeContainer: {
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//   },
//   routeText: {
//     fontSize: 16,
//     color: '#1976d2',
//     fontWeight: '500',
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   emptyText: {
//     fontSize: 16,
//     color: '#666',
//   },
// });

// export default PartyDetailScreen;