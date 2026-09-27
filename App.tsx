import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { ThemeProvider } from './src/theme/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

import VehicleList from './src/screens/Vehicle/VehicleList';
import Vehicle_list_Screen from './src/screens/Vehicle/Vehicle_list_Screen';
import EditTrip from './src/screens/Vehicle/EditTrip';
import PartyListScreen from './src/screens/Party/PartyListScreen';
import PartyMonthScreen from './src/screens/Party/PartyMonthScreen';
import PartyList_Details_Screen from './src/screens/Party/PartyList_Details_Screen';
import TripEntryScreen from './src/screens/tripentry/TripEntryScreen';
import AddCustomer from './src/screens/Customer/AddCustomer';
import CustomerList from './src/screens/Customer/CustomerList';
import EditCustomer from './src/screens/Customer/EditCustomer';
import TripList from './src/screens/Vehicle/TripList';

const Stack = createNativeStackNavigator();

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), nextUser => {
      setUser(nextUser);
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  if (initializing) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animation: 'slide_from_right'
            }}
          >
            {user ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="TripEntry" component={TripEntryScreen} />
                <Stack.Screen name="VehicleList" component={VehicleList} />
                <Stack.Screen name="VehicleDetails" component={Vehicle_list_Screen} />
                <Stack.Screen name="PartyList" component={PartyListScreen} />
                <Stack.Screen name="PartyMonths" component={PartyMonthScreen} />
                <Stack.Screen name="PartyDetails" component={PartyList_Details_Screen} />
                <Stack.Screen name="TripList" component={TripList} />
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
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default App;
