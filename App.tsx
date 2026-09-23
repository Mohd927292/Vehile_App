import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BackHandler, AppState } from 'react-native';
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
  const auth = getAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return () => unsubscribe();
  }, [initializing, auth]);

  // Android 16 back handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentRoute = navigationRef.current?.getCurrentRoute();
      console.log('🔙 Hardware back button pressed - Android 16, Current screen:', currentRoute?.name);
      return false; // Let React Navigation handle
    });
    return () => backHandler.remove();
  }, []);

  // App state change listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const currentRoute = navigationRef.current?.getCurrentRoute();
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🟢 App has come to the foreground, Current screen:', currentRoute?.name);
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('🔴 App has gone to the background, Current screen:', currentRoute?.name);
      }
      appState.current = nextAppState;
    });

    return () => subscription?.remove();
  }, []);

  if (initializing) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationContainer
          ref={navigationRef}
          onStateChange={(state) => {
            const currentRoute = state?.routes?.[state.index];
            console.log('📱 Navigation state changed to:', currentRoute?.name);
          }}
        >
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animation: 'slide_from_right'
            }}
            screenListeners={{
              beforeRemove: (e) => {
                console.log('🚫 Screen about to be removed:', e.target?.split('-')[0]);
              },
              transitionStart: (e) => {
                console.log('🔄 Screen transition started from:', e.target?.split('-')[0]);
              },
              transitionEnd: (e) => {
                console.log('✅ Screen transition ended to:', e.target?.split('-')[0]);
              }
            }}
          >
            {user ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="TripEntry" component={TripEntryScreen} />
                <Stack.Screen name="VehicleList" component={VehicleList} />
                <Stack.Screen name="VehicleDetails" component={Vehicle_list_Screen} />
                <Stack.Screen name="PartyList" component={PartyListScreen} />
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
