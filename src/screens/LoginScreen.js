import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { useTheme } from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const authMessage = code => ({
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/user-not-found': 'The email or password is incorrect.',
  'auth/wrong-password': 'The email or password is incorrect.',
  'auth/network-request-failed': 'Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
  'auth/weak-password': 'Use a password with at least six characters.',
})[code] || 'Unable to complete this request. Please try again.';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { colors, isDark } = useTheme();

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      if (registering) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      Alert.alert('Sign in failed', authMessage(error.code));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
            <Icon name="truck-fast-outline" size={38} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>TripTrack</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Trips, vehicles and parties in one place</Text>

          <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>{registering ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={[styles.formHint, { color: colors.textSecondary }]}>Your trips and customers stay in your own account</Text>

            <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="name@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email address"
            />

            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              accessibilityLabel="Password"
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={registering ? 'Create account' : 'Sign in'}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRegistering(value => !value)} disabled={loading} accessibilityRole="button">
              <Text style={[styles.accessHint, { color: colors.primary }]}>{registering ? 'Already registered? Sign in' : 'New user? Create an account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandIcon: {
    width: 68, height: 68, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18,
  },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 32 },
  form: {
    borderWidth: 1, borderRadius: 22, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 3,
  },
  formTitle: { fontSize: 22, fontWeight: '700' },
  formHint: { fontSize: 14, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    fontSize: 16,
  },
  primaryButton: {
    height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  accessHint: { textAlign: 'center', marginTop: 20, fontSize: 13 },
});

export default LoginScreen;
