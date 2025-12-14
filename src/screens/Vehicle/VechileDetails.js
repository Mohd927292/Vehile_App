// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   StatusBar,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import firestore from '@react-native-firebase/firestore';

// const VehicleDetails = ({ navigation, route }) => {
//   const { vehicle } = route.params;
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [expandedTrips, setExpandedTrips] = useState(new Set());

//   useEffect(() => {
//     console.log('\n=== VEHICLE CLICKED ===');
//     console.log('Vehicle Number:', vehicle.number);
//     console.log('Vehicle ID:', vehicle.id);
//     fetchTripsForVehicle();
//   }, [vehicle.id]);

//   const fetchTripsForVehicle = async () => {
//     try {
//       setLoading(true);
//       const tripsSnapshot = await firestore()
//         .collection('vehicles')
//         .doc(vehicle.id)
//         .collection('trips')
//         .get();
//       const tripsData = tripsSnapshot.docs.map((doc, index) => ({
//         id: doc.id,
//         srNo: index + 1,
//         ...doc.data(),
//       }));
//       setTrips(tripsData);
      
//       // Console log all trip details
//       console.log('\n=== ALL TRIP DETAILS ===');
//       console.log('Total trips found:', tripsData.length);
      
//       tripsData.forEach((trip, index) => {
//         console.log(`\n--- Trip ${index + 1} (ID: ${trip.id}) ---`);
//         console.log('Date:', trip.Date || 'Not set');
//         console.log('Driver:', trip.Driver || 'Not set');
//         console.log('Load:', trip.load || trip.Load || 'Not set');
        
//         if (trip.pairs && Array.isArray(trip.pairs) && trip.pairs.length > 0) {
//           console.log(`Pairs (${trip.pairs.length} segments):`);
//           trip.pairs.forEach((pair, pairIndex) => {
//             console.log(`  ${pairIndex + 1}. ${pair.from || 'Unknown'} → ${pair.to || 'Unknown'}`);
//           });
//         } else if (trip.routes && Array.isArray(trip.routes) && trip.routes.length > 0) {
//           console.log(`Routes (${trip.routes.length} segments):`);
//           trip.routes.forEach((route, routeIndex) => {
//             console.log(`  ${routeIndex + 1}. ${route.from || 'Unknown'} → ${route.to || 'Unknown'}`);
//           });
//         } else {
//           const from = trip.from || trip.From || 'Unknown';
//           const to = trip.to || trip.To || 'Unknown';
//           console.log('Route:', from, '→', to);
//         }
        
//         console.log('Raw data:', JSON.stringify(trip, null, 2));
//       });
      
//       console.log('\n=== END TRIP DETAILS ===\n');
//     } catch (error) {
//       console.error('Error fetching trips:', error);
//       setTrips([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDate = (dateValue) => {
//     if (!dateValue) return '—';
//     try {
//       const date = new Date(dateValue);
//       if (isNaN(date)) return String(dateValue);
//       const day = String(date.getDate()).padStart(2, '0');
//       const month = String(date.getMonth() + 1).padStart(2, '0');
//       const year = date.getFullYear();
//       return `${day}-${month}-${year}`;
//     } catch {
//       return String(dateValue);
//     }
//   };

//   const getRouteDisplay = (trip) => {
//     // Check if trip has pairs array (your data structure)
//     if (trip.pairs && Array.isArray(trip.pairs) && trip.pairs.length > 0) {
//       if (trip.pairs.length === 1) {
//         return {
//           display: `${trip.pairs[0].from} → ${trip.pairs[0].to}`,
//           hasMultiple: false,
//           totalRoutes: 1
//         };
//       }
//       return {
//         display: `${trip.pairs[0].from} → ${trip.pairs[0].to} (+${trip.pairs.length - 1} more)`,
//         hasMultiple: true,
//         totalRoutes: trip.pairs.length
//       };
//     }
    
//     // Check if trip has routes array
//     if (trip.routes && Array.isArray(trip.routes) && trip.routes.length > 0) {
//       if (trip.routes.length === 1) {
//         return {
//           display: `${trip.routes[0].from} → ${trip.routes[0].to}`,
//           hasMultiple: false,
//           totalRoutes: 1
//         };
//       }
//       return {
//         display: `${trip.routes[0].from} → ${trip.routes[0].to} (+${trip.routes.length - 1} more)`,
//         hasMultiple: true,
//         totalRoutes: trip.routes.length
//       };
//     }
    
//     // Fallback to single from/to fields
//     const from = trip.from || trip.From || '—';
//     const to = trip.to || trip.To || '—';
//     return {
//       display: `${from} → ${to}`,
//       hasMultiple: false,
//       totalRoutes: 1
//     };
//   };

//   // Function to add test data with multiple routes
//   const addTestData = async () => {
//     try {
//       const testTrip = {
//         Date: new Date().toISOString(),
//         Driver: 'Test Driver',
//         Load: 'Test Load',
//         routes: [
//           { from: 'Delhi', to: 'Mumbai' },
//           { from: 'Mumbai', to: 'Pune' },
//           { from: 'Pune', to: 'Bangalore' },
//           { from: 'Bangalore', to: 'Chennai' }
//         ]
//       };
      
//       await firestore()
//         .collection('vehicles')
//         .doc(vehicle.id)
//         .collection('trips')
//         .add(testTrip);
        
//       console.log('Test data added!');
//       fetchTripsForVehicle(); // Refresh data
//     } catch (error) {
//       console.error('Error adding test data:', error);
//     }
//   };

//   const toggleExpanded = (tripId) => {
//     setExpandedTrips(prev => {
//       const newSet = new Set(prev);
//       if (newSet.has(tripId)) {
//         newSet.delete(tripId);
//       } else {
//         newSet.add(tripId);
//       }
//       return newSet;
//     });
//   };

//   const editTrip = (tripId) => {
//     navigation.navigate('EditTrip', { tripId, vehicleId: vehicle.id });
//   };

//   const deleteTrip = (tripId) => {
//     Alert.alert(
//       'Delete Trip',
//       'Are you sure you want to delete this trip?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Delete', 
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               // Delete trip document from subcollection
//               await firestore()
//                 .collection('vehicles')
//                 .doc(vehicle.id)
//                 .collection('trips')
//                 .doc(tripId)
//                 .delete();
              
//               // Decrease loads count in main vehicle document
//               await firestore()
//                 .collection('vehicles')
//                 .doc(vehicle.id)
//                 .update({
//                   loads: firestore.FieldValue.increment(-1),
//                   updatedAt: firestore.FieldValue.serverTimestamp()
//                 });
              
//               console.log('Trip deleted and loads count decreased:', tripId);
//               fetchTripsForVehicle();
//             } catch (error) {
//               console.error('Error deleting trip:', error);
//               Alert.alert('Error', 'Failed to delete trip');
//             }
//           }
//         }
//       ]
//     );
//   };

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
//         <View style={styles.header}>
//           <TouchableOpacity
//             onPress={() => navigation.goBack()}
//             style={styles.backButton}
//           >
//             <Text style={styles.backButtonText}>← Back</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Vehicle: {vehicle.number}</Text>
//         </View>
//         <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
//       <View style={styles.header}>
//         <TouchableOpacity
//           onPress={() => navigation.goBack()}
//           style={styles.backButton}
//         >
//           <Text style={styles.backButtonText}>← Back</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Vehicle: {vehicle.number}</Text>
//         <TouchableOpacity onPress={addTestData} style={styles.testButton}>
//           <Text style={styles.testButtonText}>Add Test</Text>
//         </TouchableOpacity>
//         <Text style={styles.rowsCount}>Rows: {trips.length}</Text>
//       </View>

//       <ScrollView 
//         style={styles.verticalScrollView}
//         showsVerticalScrollIndicator={true}
//       >
//         <ScrollView 
//           horizontal 
//           showsHorizontalScrollIndicator={true}
//           scrollEventThrottle={16}
//           style={styles.horizontalScrollView}
//         >
//           <View style={styles.tableContainer}>
//           {/* Header Row */}
//           <View style={styles.tableRow}>
//             <View style={styles.tableHeaderCell}>
//               <Text style={styles.tableHeaderText}>Sr No</Text>
//             </View>
//             <View style={styles.tableHeaderCell}>
//               <Text style={styles.tableHeaderText}>Date</Text>
//             </View>
//             <View style={styles.tableHeaderCell}>
//               <Text style={styles.tableHeaderText}>Driver</Text>
//             </View>
//             <View style={[styles.tableHeaderCell, { width: 200 }]}>
//               <Text style={styles.tableHeaderText}>Route(s)</Text>
//             </View>
//             <View style={styles.tableHeaderCell}>
//               <Text style={styles.tableHeaderText}>Edit</Text>
//             </View>
//             <View style={styles.tableHeaderCell}>
//               <Text style={styles.tableHeaderText}>Delete</Text>
//             </View>
//           </View>

//           {/* Data Rows */}
//           {trips.length > 0 ? (
//             trips.map((trip) => {
//               const routeInfo = getRouteDisplay(trip);
//               const isExpanded = expandedTrips.has(trip.id);
              
//               return (
//                 <React.Fragment key={trip.id}>
//                   {/* Main Trip Row */}
//                   <View style={styles.tableRow}>
//                     <View style={styles.tableDataCell}>
//                       <Text style={styles.tableDataText}>{trip.srNo}</Text>
//                     </View>
//                     <View style={styles.tableDataCell}>
//                       <Text style={styles.tableDataText}>{formatDate(trip.Date)}</Text>
//                     </View>
//                     <View style={styles.tableDataCell}>
//                       <Text style={styles.tableDataText}>{trip.Driver ?? '—'}</Text>
//                     </View>
//                     <TouchableOpacity 
//                       style={[styles.tableDataCell, { width: 200 }]}
//                       onPress={() => routeInfo.hasMultiple && toggleExpanded(trip.id)}
//                       disabled={!routeInfo.hasMultiple}
//                     >
//                       <Text style={[
//                         styles.tableDataText, 
//                         routeInfo.hasMultiple && styles.clickableRoute
//                       ]}>
//                         {routeInfo.display}
//                       </Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity 
//                       style={styles.tableDataCell}
//                       onPress={() => editTrip(trip.id)}
//                     >
//                       <Text style={styles.actionButtonText}>✏️</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity 
//                       style={styles.tableDataCell}
//                       onPress={() => deleteTrip(trip.id)}
//                     >
//                       <Text style={styles.actionButtonText}>🗑️</Text>
//                     </TouchableOpacity>
//                   </View>
                  
//                   {/* Expanded Routes - Only in Route Column */}
//                   {isExpanded && (trip.pairs?.length > 1 || trip.routes?.length > 1) && (
//                     <View style={styles.expandedRouteRow}>
//                       {/* Empty cells for Sr No, Date, Driver */}
//                       <View style={styles.tableDataCell}></View>
//                       <View style={styles.tableDataCell}></View>
//                       <View style={styles.tableDataCell}></View>
                      
//                       {/* Expanded routes in Route column */}
//                       <View style={[styles.tableDataCell, { width: 200, alignItems: 'flex-start', paddingLeft: 20 }]}>
//                         {trip.pairs && trip.pairs.slice(1).map((pair, index) => (
//                           <Text key={index} style={styles.expandedRouteText}>
//                             {pair.from} → {pair.to}
//                           </Text>
//                         ))}
//                         {trip.routes && trip.routes.slice(1).map((route, index) => (
//                           <Text key={index} style={styles.expandedRouteText}>
//                             {route.from} → {route.to}
//                           </Text>
//                         ))}
//                       </View>
                      
//                       {/* Empty cells for Edit, Delete */}
//                       <View style={styles.tableDataCell}></View>
//                       <View style={styles.tableDataCell}></View>
//                     </View>
//                   )}
//                 </React.Fragment>
//               );
//             })
//           ) : (
//             <View style={styles.noDataRow}>
//               <Text style={styles.noDataText}>No trips found</Text>
//             </View>
//           )}
//           </View>
//         </ScrollView>
//       </ScrollView>
//     </View>
//   );
// };

// export default VehicleDetails;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#1a1a1a',
//   },
//   verticalScrollView: {
//     flex: 1,
//   },
//   horizontalScrollView: {
//     flex: 1,
//   },
//   tableContainer: {
//     flexDirection: 'column',
//   },
//   header: {
//     backgroundColor: '#7b2ff2',
//     padding: 20,
//     paddingTop: 50,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//     flex: 1,
//   },
//   rowsCount: {
//     fontSize: 14,
//     color: '#fff',
//     marginLeft: 10,
//   },
//   backButton: {
//     width: 60,
//     marginRight: 10,
//   },
//   backButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   tableRow: {
//     flexDirection: 'row',
//     borderBottomWidth: 1,
//     borderBottomColor: '#444',
//   },
//   tableHeaderCell: {
//     backgroundColor: '#7b2ff2',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     width: 120,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRightWidth: 1,
//     borderRightColor: '#5a1fa0',
//   },
//   tableHeaderText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 14,
//   },
//   tableDataCell: {
//     backgroundColor: '#2a2a2a',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     width: 120,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRightWidth: 1,
//     borderRightColor: '#444',
//   },
//   tableDataText: {
//     color: '#fff',
//     fontSize: 14,
//   },
//   clickableRoute: {
//     color: '#4CAF50',
//     textDecorationLine: 'underline',
//   },
//   expandedRouteRow: {
//     flexDirection: 'row',
//     borderBottomWidth: 1,
//     borderBottomColor: '#444',
//     backgroundColor: '#1f1f1f',
//   },
//   expandedRouteText: {
//     color: '#4CAF50',
//     fontSize: 14,
//     paddingVertical: 2,
//   },
//   testButton: {
//     backgroundColor: '#4CAF50',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 4,
//     marginRight: 10,
//   },
//   testButtonText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   editButton: {
//     backgroundColor: '#2196F3',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//     marginRight: 4,
//   },
//   deleteButton: {
//     backgroundColor: '#f44336',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   actionButtonText: {
//     fontSize: 12,
//   },
//   noDataRow: {
//     flexDirection: 'row',
//     paddingVertical: 30,
//     paddingHorizontal: 16,
//     justifyContent: 'center',
//   },
//   noDataText: {
//     color: '#888',
//     fontSize: 14,
//   },
// });
