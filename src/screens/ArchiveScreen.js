import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { tripService } from '../config/firebase';
import { useTheme } from '../hooks/useTheme';

export default function ArchiveScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [error, setError] = useState('');
  const cursor = useRef(null);
  const busy = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { const page = await tripService.getArchivedTrips(); setRows(page.trips); cursor.current = page.cursor; setHasMore(page.hasMore); }
    catch (failure) { setError(failure.message || 'Unable to load archive.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const loadMore = async () => {
    if (loading || busy.current || !hasMore) return;
    busy.current = true; setLoadingMore(true); setError('');
    try { const page = await tripService.getArchivedTrips({ cursor: cursor.current }); setRows(current => [...current, ...page.trips]); cursor.current = page.cursor; setHasMore(page.hasMore); }
    catch (failure) { setError(failure.message || 'Unable to load more trips.'); }
    finally { busy.current = false; setLoadingMore(false); }
  };
  const restore = async id => {
    if (restoring) return;
    setRestoring(id);
    try { await tripService.restoreTrip(id); await reload(); }
    catch (failure) { Alert.alert('Restore failed', failure.message); }
    finally { setRestoring(null); }
  };
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" style={{ padding: 16 }}><Text style={{ color: colors.primary }}>‹ Back</Text></TouchableOpacity>
    <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', paddingHorizontal: 16 }}>Archived trips</Text>
    <Text style={{ color: colors.textSecondary, padding: 16 }}>Recently removed trips can be restored with their route and totals. Scroll to load older records.</Text>
    {!!error && <TouchableOpacity onPress={reload}><Text style={{ color: colors.danger, padding: 16 }}>{error} Tap to retry.</Text></TouchableOpacity>}
    {loading ? <ActivityIndicator color={colors.primary} /> : <FlatList data={rows} keyExtractor={item => item.id}
      onRefresh={reload} refreshing={loading} ListFooterComponent={hasMore ? <TouchableOpacity disabled={loadingMore} onPress={loadMore} style={{ padding: 20 }}><Text style={{ color: colors.primary }}>{loadingMore ? 'Loading…' : 'Load older trips'}</Text></TouchableOpacity> : null} ListEmptyComponent={<Text style={{ color: colors.textSecondary, padding: 16 }}>No archived trips.</Text>}
      renderItem={({ item }) => <View style={{ padding: 16, margin: 12, borderRadius: 12, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{item.vehicleNo} · {item.date}</Text>
        <Text style={{ color: colors.textSecondary, marginVertical: 8 }}>{item.locations?.length || 0} routes · {item.driverName}</Text>
        <TouchableOpacity disabled={!!restoring} onPress={() => restore(item.id)} accessibilityRole="button" style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.primary }}>{restoring === item.id ? 'Restoring…' : 'Restore trip'}</Text>
        </TouchableOpacity>
      </View>} />}
  </View>;
}
