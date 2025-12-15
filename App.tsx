import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

import VehicleList from './src/screens/Vehicle/VehicleList';


import EditTrip from './src/screens/Vehicle/EditTrip';

import PartyListScreen from './src/screens/Party/PartyListScreen';
import PartyDetailScreen from './src/screens/Party/PartyDetailScreen';
import TripEntryScreen from './src/screens/tripentry/TripEntryScreen';

import AddCustomer from './src/screens/Customer/AddCustomer';
import CustomerList from './src/screens/Customer/CustomerList';
import EditCustomer from './src/screens/Customer/EditCustomer';
import TripList from './src/screens/Vehicle/TripList';

const Stack = createNativeStackNavigator();

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const auth = getAuth();

  useEffect(() => {
    console.log('Firebase Auth initialized');
    const unsubscribe = onAuthStateChanged(auth, user => {
      console.log(
        'Auth state changed:',
        user ? `User: ${user.uid}` : 'No user',
      );
      setUser(user);
      if (initializing) setInitializing(false);
    });

    return () => unsubscribe();
  }, [initializing, auth]);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            {/* 1. Entry Screen */}
            <Stack.Screen name="TripEntry" component={TripEntryScreen} />
            {/* 2. Vehicle Screen */}
            <Stack.Screen name="VehicleList" component={VehicleList} />
            
            {/* 3. Party Screen */}
            <Stack.Screen name="PartyListScreen" component={PartyListScreen} />
            <Stack.Screen name="PartyDetailsScreen" component={PartyDetailScreen} />

            {/* 4. All Trip List */}
            <Stack.Screen name="TripList" component={TripList} />     
            {/* Edit Trip List */}
            <Stack.Screen name="EditTrip" component={EditTrip} />

            <Stack.Screen name="AddCustomer" component={AddCustomer} />
            <Stack.Screen name="CustomerList" component={CustomerList} />
            <Stack.Screen name="EditCustomer" component={EditCustomer} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
