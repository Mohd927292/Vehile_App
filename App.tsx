import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { NativeRouter, Routes, Route, useNavigate, useLocation } from 'react-router-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
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

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const backAction = () => {
      if (location.pathname === '/') {
        BackHandler.exitApp();
        return true;
      }
      navigate(-1);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigate, location.pathname]);

  return null;
};

const AppNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return () => unsubscribe();
  }, [initializing, auth]);

  if (initializing) return null;

  return (
    <NativeRouter future={{ v7_relativeSplatPath: true }}>
      <BackButtonHandler />
      <Routes>
        {user ? (
          <>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/trip-entry" element={<TripEntryScreen />} />
            <Route path="/vehicle-list" element={<VehicleList />} />
            <Route path="/vehicle-details" element={<Vehicle_list_Screen />} />
            <Route path="/party-list" element={<PartyListScreen />} />
            <Route path="/party-details" element={<PartyList_Details_Screen />} />
            <Route path="/trip-list" element={<TripList />} />
            <Route path="/edit-trip" element={<EditTrip />} />
            <Route path="/add-customer" element={<AddCustomer />} />
            <Route path="/customer-list" element={<CustomerList />} />
            <Route path="/edit-customer" element={<EditCustomer />} />
          </>
        ) : (
          <Route path="/" element={<LoginScreen />} />
        )}
      </Routes>
    </NativeRouter>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

export default App;
