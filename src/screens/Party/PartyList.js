// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   ActivityIndicator,
//   StyleSheet,
//   StatusBar,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import firestore from '@react-native-firebase/firestore';

// const PartyList = () => {
//   const [parties, setParties] = useState([]);
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedParty, setSelectedParty] = useState(null);

//   useEffect(() => {
//     const unsubscribe = firestore()
//       .collection('vehicles')
//       .onSnapshot(snapshot => {
//         const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//         setParties(data);
//         setLoading(false);
//       });
//     return () => unsubscribe();
//   }, []);

//   const fetchTripsForParty = async (vehicleId) => {
//     try {
//       const tripsSnapshot = await firestore()
//         .collection('vehicles')
//         .doc(vehicleId)
//         .collection('trips')
//         .get();
//       const tripsData = tripsSnapshot.docs.map((doc, index) => ({ 
//         id: doc.id, 
//         srNo: index + 1,
//         ...doc.data() 
//       }));
//       setTrips(tripsData);
//     } catch (error) {
//       console.error('Error fetching trips:', error);
//       setTrips([]);
//     }
//   };

//   const renderPartyItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.partyCard}
//       onPress={() => {
//         setSelectedParty(item);
//         fetchTripsForParty(item.id);
//       }}
//       activeOpacity={0.7}
//     >
//       <Text style={styles.partyNumber}>{item.number ?? '—'}</Text>
//       <Text style={styles.partyInfo}>Loads: {item.loads ?? '0'}</Text>
//       <Text style={styles.partyInfo}>Last updated: {formatDate(item.updatedAt)}</Text>
//     </TouchableOpacity>
//   );

//   const renderItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.item}
//       onPress={() => {
//         console.log('Selected Row:', item);
//         setSelectedParty(item);
//       }}
//       activeOpacity={0.7}
//     >
//       <View style={styles.rowContent}>
//         <Text style={styles.srNo}>{item.srNo}</Text>
//         <Text style={styles.column}>{item.vehicleName ?? '—'}</Text>
//         <Text style={styles.column}>{item.vehicleNumber ?? '—'}</Text>
//         <Text style={styles.column}>{item.driver ?? '—'}</Text>
//         <Text style={styles.column}>{item.from ?? '—'}</Text>
//         <Text style={styles.column}>{item.to ?? '—'}</Text>
//         <Text style={styles.column}>{item.date ?? '—'}</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   if (loading) {
//     return <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />;
//   }

//   // Helper function to format date
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

//   // Detail Row Component
//   const DetailRow = ({ label, value }) => (
//     <View style={styles.detailRow}>
//       <Text style={styles.detailLabel}>{label}:</Text>
//       <Text style={styles.detailValue}>{value ?? '—'}</Text>
//     </View>
//   );

//   // Show selected party details (optional detail view)
//   if (selectedParty) {
//     return (
//       <View style={styles.container}>
//         <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
//         <View style={styles.header}>
//           <TouchableOpacity
//             onPress={() => setSelectedParty(null)}
//             style={styles.backButton}
//           >
//             <Text style={styles.backButtonText}>← Back</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Trip Details</Text>
//           <View style={{ width: 60 }} />
//         </View>

//         <View style={styles.detailsContainer}>
//           <DetailRow label="SR No" value={String(selectedParty.srNo)} />
//           <DetailRow label="Vehicle Name" value={selectedParty.vehicleName} />
//           <DetailRow label="Vehicle No" value={selectedParty.vehicleNumber} />
//           <DetailRow label="Driver" value={selectedParty.driver} />
//           <DetailRow label="From" value={selectedParty.from} />
//           <DetailRow label="To" value={selectedParty.to} />
//           <DetailRow label="Date" value={formatDate(selectedParty.date)} />
//         </View>
//       </View>
//     );
//   }
//   // Show party details view
//   if (selectedParty) {
//     // Define field order: SR No first, then specific fields, then remaining fields
//     const priorityFields = ['SR No', 'Vehicle No', 'Date', 'Driver', 'From', 'To', 'Location'];
//     const allDataFields = Object.keys(selectedParty).filter(key => key !== 'id');
    
//     // Combine priority fields with remaining fields (that exist in data)
//     const orderedFields = [];
    
//     // Add SR No (always first)
//     orderedFields.push('SR No');
    
//     // Add other priority fields if they exist in data
//     priorityFields.forEach(field => {
//       if (field !== 'SR No' && allDataFields.includes(field)) {
//         orderedFields.push(field);
//       }
//     });
    
//     // Add remaining fields (excluding From, To from party details)
//     allDataFields.forEach(field => {
//       if (!orderedFields.includes(field) && field !== 'From' && field !== 'To') {
//         orderedFields.push(field);
//       }
//     });

//     // Trip headings
//     const tripHeadings = ['SR No', 'Date', 'Driver', 'Vehicle No', 'From', 'To'];
    
//     return (
//       <View style={styles.container}>
//         <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
//         <View style={styles.header}>
//           <TouchableOpacity
//             onPress={() => {
//               setSelectedParty(null);
//               setTrips([]);
//             }}
//             style={styles.backButton}
//           >
//             <Text style={styles.backButtonText}>← Back</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Party Details</Text>
//           <View style={{ width: 60 }} />
//         </View>

//         <ScrollView horizontal showsHorizontalScrollIndicator={true}>
//           <View>
//             {/* Party Header Row */}
//             <View style={styles.tableRow}>
//               {orderedFields.map((field, index) => (
//                 <View key={index} style={styles.headerCell}>
//                   <Text style={styles.headerText}>{field}</Text>
//                 </View>
//               ))}
//             </View>

//             {/* Party Data Row */}
//             <View style={styles.tableRow}>
//               {orderedFields.map((field, index) => (
//                 <View key={index} style={styles.dataCell}>
//                   <Text style={styles.dataText}>
//                     {field === 'SR No' 
//                       ? '1'
//                       : field === 'Date'
//                       ? formatDate(selectedParty[field])
//                       : String(selectedParty[field] ?? '—')}
//                   </Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         </ScrollView>

//         {/* Trips Section */}
//         {trips.length > 0 && (
//           <View style={{ paddingVertical: 16, paddingHorizontal: 12 }}>
//             <Text style={styles.sectionTitle}>Trips</Text>
//             <ScrollView horizontal showsHorizontalScrollIndicator={true}>
//               <View>
//                 {/* Trip Header Row */}
//                 <View style={styles.tableRow}>
//                   {tripHeadings.map((field, index) => (
//                     <View key={index} style={styles.headerCell}>
//                       <Text style={styles.headerText}>{field}</Text>
//                     </View>
//                   ))}
//                 </View>

//                 {/* Trip Data Rows */}
//                 {trips.map((trip, tripIndex) => (
//                   <View key={trip.id} style={styles.tableRow}>
//                     {tripHeadings.map((field, index) => (
//                       <View key={index} style={styles.dataCell}>
//                         <Text style={styles.dataText}>
//                           {field === 'SR No'
//                             ? tripIndex + 1
//                             : field === 'Date'
//                             ? formatDate(trip[field])
//                             : String(trip[field] ?? '—')}
//                         </Text>
//                       </View>
//                     ))}
//                   </View>
//                 ))}
//               </View>
//             </ScrollView>
//           </View>
//         )}
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#7b2ff2" />
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Party List</Text>
//       </View>

//       {/* Header Row */}
//       <View style={[styles.item, { backgroundColor: '#7b2ff2' }]}>
//         <View style={styles.rowContent}>
//           <Text style={[styles.srNo, { color: '#fff', fontWeight: 'bold' }]}>SR</Text>
//           <Text style={[styles.column, { color: '#fff', fontWeight: 'bold' }]}>Vehicle</Text>
//           <Text style={[styles.column, { color: '#fff', fontWeight: 'bold' }]}>Number</Text>
//           <Text style={[styles.column, { color: '#fff', fontWeight: 'bold' }]}>Driver</Text>
//           <Text style={[styles.column, { color: '#fff', fontWeight: 'bold' }]}>From</Text>
//           <Text style={[styles.column, { color: '#fff', fontWeight: 'bold' }]}>To</Text>
//           <Text style={[styles.column, { color: '#fff', fontWeight: 'bold' }]}>Date</Text>
//         </View>
//       </View>

//       {/* Data Rows */}
//       <FlatList
//         data={parties}
//         keyExtractor={item => item.id}
//         renderItem={renderPartyItem}
//         ListEmptyComponent={<Text style={styles.empty}>No parties found.</Text>}
//       />
//     </View>
//   );
// };

// export default PartyList;


// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
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
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     textAlign: 'center',
//     flex: 1,
//   },
//   backButton: {
//     width: 60,
//   },
//   backButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   item: {
//     backgroundColor: '#fff',
//     padding: 16,
//     marginHorizontal: 12,
//     marginVertical: 6,
//     borderRadius: 8,
//     elevation: 2,
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   details: {
//     fontSize: 15,
//     color: '#666',
//     marginTop: 4,
//   },
//   empty: {
//     color: '#888',
//     textAlign: 'center',
//     paddingVertical: 30,
//     fontSize: 16,
//   },
//   tableRow: {
//     flexDirection: 'row',
//   },
//   headerCell: {
//     backgroundColor: '#7b2ff2',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     minWidth: 180,
//     justifyContent: 'center',
//     borderRightWidth: 1,
//     borderRightColor: '#5a1fa0',
//   },
//   headerText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 14,
//   },
//   dataCell: {
//     backgroundColor: '#fff',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     minWidth: 180,
//     justifyContent: 'center',
//     borderRightWidth: 1,
//     borderRightColor: '#e0e0e0',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//   },
//   dataText: {
//     color: '#333',
//     fontSize: 14,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#7b2ff2',
//     marginBottom: 8,
//   },
// });
