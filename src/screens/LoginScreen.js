import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { useTheme } from '../hooks/useTheme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      console.log('Login Error: Empty fields');
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    console.log('Attempting login with:', email);
    console.log('Firebase app initialized:', !!getApp());
    setLoading(true);
    try {
      const result = await auth().signInWithEmailAndPassword(email, password);
      console.log('Login successful:', result.user.uid);
    } catch (error) {
      console.log('Login error:', error.code, error.message);
      Alert.alert('Login Failed', `${error.code}: ${error.message}`);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      console.log('SignUp Error: Empty fields');
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    console.log('Attempting signup with:', email);
    setLoading(true);
    try {
      const result = await auth().createUserWithEmailAndPassword(email, password);
      console.log('SignUp successful:', result.user.uid);
    } catch (error) {
      console.log('SignUp error:', error.code, error.message);
      Alert.alert('Sign Up Failed', `${error.code}: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Vehicle App</Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.success }]} 
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;