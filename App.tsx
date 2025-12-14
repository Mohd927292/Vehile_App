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
import Party_Section from './src/screens/Party/Party_Section';
import VehicleList from './src/screens/Vehicle/VehicleList';
import VehicleDetails from './src/screens/Vehicle/VechileDetails';
import VehicleDetailScreen from './src/screens/Vehicle/VehicleDetailScreen';
import EditTrip from './src/screens/Vehicle/EditTrip';
import PartyList from './src/screens/Party/PartyList';
import PartyListScreen from './src/screens/Party/PartyListScreen';
import PartyDetailScreen from './src/screens/Party/PartyDetailScreen';
import TripEntryScreen from './src/screens/tripentry/TripEntryScreen';
import Details_updator from './src/screens/tripentry/Details_updator';
import AddCustomer from './src/screens/Customer/AddCustomer';
import CustomerList from './src/screens/Customer/CustomerList';
import EditCustomer from './src/screens/Customer/EditCustomer';
import TripList from './src/screens/Party/TripList';

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

            <Stack.Screen name="TripEntry" component={TripEntryScreen} />

            <Stack.Screen name="VehicleList" component={VehicleList} />
            <Stack.Screen name="VehicleDetails" component={VehicleDetailScreen} />

            <Stack.Screen name="PartyList" component={PartyListScreen} />
            <Stack.Screen name="PartyDetails" component={PartyDetailScreen} />
            <Stack.Screen name="TripList" component={TripList} />
            <Stack.Screen name="Vehicle" component={Details_updator} />

            <Stack.Screen name="Party_Section" component={Party_Section} />
            {/* <Stack.Screen name="VehicleDetailsOld" component={VehicleDetails} /> */}

            <Stack.Screen name="EditTrip" component={EditTrip} />
            {/* <Stack.Screen name="PartyListOld" component={PartyList} /> */}
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
