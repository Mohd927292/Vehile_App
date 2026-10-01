import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { collection, getDocsFromServer as getDocs, getFirestore } from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { useWorkspace } from '../context/WorkspaceContext';
import { LEGACY_WORKSPACE } from '../services/workspace';

export default function WorkspaceSwitcher() {
  const { colors } = useTheme();
  const { isAdmin, member, workspace, switchWorkspace } = useWorkspace();
  const [visible, setVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const open = async () => {
    setVisible(true); setLoading(true); setError(''); setSearch('');
    try {
      const snapshot = await getDocs(collection(getFirestore(), 'staff'));
      setUsers(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.active)
        .sort((a, b) => String(a.displayName || a.email).localeCompare(String(b.displayName || b.email))));
    } catch (failure) { setError(failure.message || 'Unable to load users.'); }
    finally { setLoading(false); }
  };
  const choose = item => { setVisible(false); switchWorkspace(item); };
  if (!isAdmin) return <View style={{ flex: 1 }}><Text style={{ color: colors.textSecondary, fontSize: 11 }}>YOUR ACCOUNT</Text><Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{workspace?.displayName}</Text></View>;
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Switch user" onPress={open} style={{ flex: 1, flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 48 }}>
      <Icon name="account-switch-outline" size={26} color={colors.primary} />
      <View style={{ flex: 1 }}><Text style={{ color: colors.textSecondary, fontSize: 11 }}>SWITCH USER</Text><Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{workspace?.displayName}</Text></View>
      <Icon name="chevron-down" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, maxHeight: '85%' }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>Choose a user</Text>
          <Text style={{ color: colors.textSecondary, marginVertical: 10 }}>You remain signed in as administrator. Changes belong to the selected user.</Text>
          <TextInput value={search} onChangeText={setSearch} placeholder="Find a user" placeholderTextColor={colors.textSecondary} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text }} />
          {loading ? <ActivityIndicator style={{ padding: 24 }} color={colors.primary} /> : <FlatList style={{ flexGrow: 0 }} data={users.filter(item => `${item.displayName} ${item.email}`.toLowerCase().includes(search.toLowerCase()))}
            keyExtractor={item => item.id} ListEmptyComponent={<Text style={{ color: colors.textSecondary, padding: 16 }}>No matching users.</Text>}
            renderItem={({ item }) => <TouchableOpacity onPress={() => choose(item)} accessibilityRole="button" accessibilityLabel={`Open workspace ${item.email}`} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.displayName || item.email}{item.id === member.id ? ' · You' : ''}{workspace.id === item.id ? ' ✓' : ''}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{item.email}</Text>
            </TouchableOpacity>} />}
          {!!error && <TouchableOpacity onPress={open}><Text style={{ color: colors.danger, paddingVertical: 12 }}>{error} Tap to retry.</Text></TouchableOpacity>}
          <TouchableOpacity onPress={() => choose({ id: LEGACY_WORKSPACE, displayName: 'Existing shared data', email: '' })} accessibilityRole="button" accessibilityLabel="Review existing shared data" style={{ paddingVertical: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Existing shared data</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>Read only · preserved original records</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setVisible(false)} accessibilityRole="button" style={{ padding: 12 }}><Text style={{ color: colors.primary, textAlign: 'center' }}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>;
}
