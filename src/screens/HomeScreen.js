import React from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { useWorkspace } from '../context/WorkspaceContext';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';

const destinations = [
  { label: 'Add Trip', detail: 'Record a journey', icon: 'plus-circle-outline', screen: 'TripEntry', write: true },
  { label: 'All Trips', detail: 'Browse your history', icon: 'format-list-bulleted-square', screen: 'TripList' },
  { label: 'Vehicles', detail: 'Trips by vehicle', icon: 'truck-outline', screen: 'VehicleList' },
  { label: 'Parties', detail: 'Loads by destination', icon: 'domain', screen: 'PartyList' },
  { label: 'Customers', detail: 'Contact and billing details', icon: 'account-group-outline', screen: 'CustomerList' },
  { label: 'Archive', detail: 'Restore removed trips', icon: 'archive-outline', screen: 'Archive', write: true },
];

export default function HomeScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const { workspace, isAdmin, readOnly, member } = useWorkspace();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const logout = async () => {
    try { await signOut(getAuth()); }
    catch { Alert.alert('Sign out failed', 'Please try again.'); }
  };
  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <WorkspaceSwitcher />
      <TouchableOpacity onPress={toggleTheme} accessibilityRole="button" accessibilityLabel="Toggle theme" style={styles.iconButton}><Icon name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'} color={colors.primary} size={24} /></TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>TRIPTRACK {isAdmin ? ' / ADMIN' : ''}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{readOnly ? 'Existing records' : 'Your transport desk'}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{readOnly ? 'Preserved for review. Choose where to place these records before making changes.' : `Working in ${workspace?.displayName}’s account`}</Text>
      {isAdmin && !readOnly && member.id !== workspace.id && <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}><Icon name="account-eye-outline" size={22} color={colors.primary} /><Text style={{ color: colors.text, flex: 1 }}>Viewing {workspace.email}. Entries and edits stay in this user’s account.</Text></View>}
      <View style={styles.grid}>{destinations.filter(item => !readOnly || !item.write).map(item => <TouchableOpacity key={item.screen} onPress={() => navigation.navigate(item.screen)} accessibilityRole="button" accessibilityLabel={item.label} style={[styles.card, { width: width < 380 ? '100%' : '48%', backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name={item.icon} size={30} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.label}</Text><Text style={[styles.cardDetail, { color: colors.textSecondary }]}>{item.detail}</Text>
      </TouchableOpacity>)}</View>
      <TouchableOpacity onPress={logout} accessibilityRole="button" accessibilityLabel="Logout" style={styles.logout}><Icon name="logout" size={20} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary }}>Sign out</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 16 },
  iconButton: { padding: 12 }, content: { padding: 20, maxWidth: 900, alignSelf: 'center', width: '100%' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 14 }, title: { fontSize: 30, fontWeight: '700', marginTop: 12 },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 24 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { minHeight: 150, borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 }, cardTitle: { fontSize: 18, fontWeight: '700', marginTop: 14 }, cardDetail: { fontSize: 13, marginTop: 6 },
  logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 20, marginTop: 4 },
});
