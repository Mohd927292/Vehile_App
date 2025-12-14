import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle App</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.signUpButton]} 
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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  signUpButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;