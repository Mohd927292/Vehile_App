import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { useTheme } from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const images = [
  require('../../assets/images/home-1.webp'),
  require('../../assets/images/home-2.webp'),
  require('../../assets/images/home-3.webp'),
  require('../../assets/images/home-4.webp'),
  require('../../assets/images/home-5.webp'),
];

const HomeScreen = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;
        scrollViewRef.current?.scrollTo({ x: nextIndex * (screenWidth - 40), animated: true });
        return nextIndex;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [screenWidth]);
  
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
          <View style={styles.logoIconWrapper}>
            <Image 
              source={require('../../assets/icons/Icon-192.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.logoAppName, { color: colors.text }]}>TripTrack</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.themeToggle, { backgroundColor: colors.textSecondary }]}
          onPress={toggleTheme}
        >
          <Icon name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'} size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.customerListIcon, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CustomerList')}
        >
          <Icon name="account-group" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        <View style={styles.sliderContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 40));
              setCurrentIndex(index);
            }}
          >
            {images.map((img, index) => (
              <Image key={index} source={img} style={[styles.sliderImage, { width: screenWidth - 40 }]} resizeMode="cover" />
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {images.map((_, index) => (
              <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
            ))}
          </View>
        </View>
        
        <View style={styles.menuGrid}>
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('TripEntry')}
          >
            <Icon name="plus-circle" size={48} color="#4CAF50" />
            <Text style={[styles.menuText, { color: colors.text }]}>Add Trip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('VehicleList')}
          >
            <Icon name="truck-fast" size={48} color="#FF9800" />
            <Text style={[styles.menuText, { color: colors.text }]}>Vehicles</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('PartyList')}
          >
            <Icon name="domain" size={48} color="#9C27B0" />
            <Text style={[styles.menuText, { color: colors.text }]}>Parties</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('TripList')}
          >
            <Icon name="format-list-bulleted-square" size={48} color="#2196F3" />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logoContainer: {
    flex: 1,
  },
  logoIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 45,
    height: 45,
  },
  logoAppName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerListIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  sliderContainer: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sliderImage: {
    height: 200,
    borderRadius: 12,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF6B35',
    width: 24,
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
