import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
  signOut,
} from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
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

function AccessScreen({ retry, failed }: { retry: () => void; failed: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 28, backgroundColor: colors.background }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
        {failed ? 'Unable to check access' : 'Access is restricted'}
      </Text>
      <Text style={{ marginTop: 12, fontSize: 16, lineHeight: 24, color: colors.textSecondary }}>
        {failed
          ? 'Check your connection and try again.'
          : 'This account is not approved for TripTrack. Ask the project administrator to grant access.'}
      </Text>
      <Pressable onPress={retry} style={{ marginTop: 28, padding: 16, borderRadius: 12, backgroundColor: colors.primary }} accessibilityRole="button">
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Try again</Text>
      </Pressable>
      <Pressable onPress={() => signOut(getAuth())} style={{ marginTop: 12, padding: 16 }} accessibilityRole="button">
        <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied' | 'error' | 'signedOut'>('checking');
  const accessRequest = useRef(0);

  const checkAccess = useCallback(async (nextUser: FirebaseAuthTypes.User) => {
    const request = ++accessRequest.current;
    setAccess('checking');
    try {
      const membership = await getDoc(doc(getFirestore(), 'staff', nextUser.uid));
      if (request === accessRequest.current) {
        setAccess(membership.exists() && membership.data()?.active === true ? 'allowed' : 'denied');
      }
    } catch {
      if (request === accessRequest.current) setAccess('error');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), nextUser => {
      setUser(nextUser);
      if (nextUser) {
        void checkAccess(nextUser);
      } else {
        ++accessRequest.current;
        setAccess('signedOut');
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, [checkAccess]);

  if (initializing || access === 'checking') {
    return <ThemeProvider><View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View></ThemeProvider>;
  }

  if (user && access !== 'allowed') {
    return <ThemeProvider><AccessScreen failed={access === 'error'} retry={() => void checkAccess(user)} /></ThemeProvider>;
  }

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
