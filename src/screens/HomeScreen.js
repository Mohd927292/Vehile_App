import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { useTheme } from '../hooks/useTheme';

const HomeScreen = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation();
  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with logo and customer list icon */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.border }]}>
            <Text style={[styles.logoText, { color: colors.textSecondary }]}>LOGO</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.themeToggle, { backgroundColor: colors.textSecondary }]}
          onPress={toggleTheme}
        >
          <Text style={styles.iconText}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.customerListIcon, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CustomerList')}
        >
          <Text style={styles.iconText}>👥</Text>
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Trip Tracking System</Text>
        
        <View style={styles.menuGrid}>
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('TripEntry')}
          >
            <Text style={styles.menuIcon}>➕</Text>
            <Text style={[styles.menuText, { color: colors.text }]}>Add Trip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('VehicleList')}
          >
            <Text style={styles.menuIcon}>🚛</Text>
            <Text style={[styles.menuText, { color: colors.text }]}>Vehicles</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('PartyList')}
          >
            <Text style={styles.menuIcon}>🏢</Text>
            <Text style={[styles.menuText, { color: colors.text }]}>Parties</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('TripList')}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={[styles.menuText, { color: colors.text }]}>All Trips</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.danger }]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    flex: 1,
  },
  logoPlaceholder: {
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  logoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  customerListIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  menuButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    padding: 15,
    borderRadius: 8,
    margin: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;