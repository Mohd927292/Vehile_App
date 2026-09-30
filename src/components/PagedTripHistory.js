import { useWorkspace } from '../context/WorkspaceContext';
import { getWorkspaceId } from '../services/workspace';
import React, { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { tripService } from '../config/firebase';
import { useTheme } from '../hooks/useTheme';
import { filterTripsByQuery, parseTripDate } from '../utils/tripData';
import TripCard from './TripCard';
import TripListExport from './Pdf_Excel_calender_Sort';

const PAGE_SIZE = 40;
const displayTrip = trip => ({
  ...trip,
  date: trip.date || 'N/A',
  vehicleNo: trip.vehicleNo || 'N/A',
  driverName: trip.driverName || 'N/A',
  amount: trip.amount == null ? '' : String(trip.amount),
  locations: trip.locations || [],
  loadCount: trip.locations?.length || 0,
  createdAt: parseTripDate(trip.createdAt),
});

export default function PagedTripHistory({ title, vehicleNo = null }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { readOnly } = useWorkspace();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState('desc');
  const [search, setSearch] = useState('');
  const [exportData, setExportData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const cursor = useRef(null);
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);
  const deferredSearch = useDeferredValue(search);
  const visibleTrips = useMemo(() => filterTripsByQuery(trips, deferredSearch), [trips, deferredSearch]);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true); setError(''); setHasMore(false); setExportData(null); cursor.current = null;
    try {
      const page = await tripService.getTripPage({ vehicleNo, direction, pageSize: PAGE_SIZE });
      if (id !== requestId.current) return;
      cursor.current = page.cursor;
      setTrips(page.trips.map(displayTrip));
      setHasMore(page.hasMore);
    } catch (failure) {
      if (id === requestId.current) setError(failure.message || 'Unable to load trips.');
    } finally { if (id === requestId.current) setLoading(false); }
  }, [vehicleNo, direction]);
  useFocusEffect(useCallback(() => { reload(); return () => { requestId.current += 1; }; }, [reload]));

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || !hasMore || !cursor.current || search.trim()) return;
    loadingMoreRef.current = true; setLoadingMore(true);
    const id = requestId.current;
    try {
      const page = await tripService.getTripPage({ vehicleNo, direction, cursor: cursor.current, pageSize: PAGE_SIZE });
      if (id !== requestId.current) return;
      cursor.current = page.cursor;
      setTrips(current => [...current, ...page.trips.map(displayTrip)]);
      setHasMore(page.hasMore);
    } catch (failure) {
      if (id === requestId.current) setError(failure.message || 'Unable to load more trips.');
    } finally { loadingMoreRef.current = false; setLoadingMore(false); }
  }, [loading, hasMore, search, vehicleNo, direction]);

  const prepareExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true); setExportData(null); setExportCount(0);
    try {
      const workspaceId = getWorkspaceId();
      let nextCursor = null, all = [], more = true;
      while (more) {
        const page = await tripService.getTripPage({ vehicleNo, direction, cursor: nextCursor, pageSize: 100, workspaceId });
        all = all.concat(page.trips.map(displayTrip));
        setExportCount(all.length);
        nextCursor = page.cursor; more = page.hasMore;
      }
      setExportData(filterTripsByQuery(all, search));
    } catch (failure) { Alert.alert('Export unavailable', failure.message || 'Could not prepare all trips.'); }
    finally { setExporting(false); }
  }, [exporting, vehicleNo, direction, search]);

  const deleteTrip = tripId => Alert.alert('Delete trip', 'Move this trip to Archive? You can restore it later.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await tripService.deleteTrip(tripId); await reload(); }
      catch (failure) { Alert.alert('Delete failed', failure.message || 'Please try again.'); }
    } },
  ]);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.hero, { backgroundColor: colors.primary }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back" style={styles.back}><Icon name="chevron-left" size={28} color="#fff" /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.eyebrow}>TRIP HISTORY</Text><Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle}>{trips.length}{hasMore ? '+' : ''} trips loaded</Text></View>
    </View>
    <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextInput style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        placeholder="Search loaded trips" placeholderTextColor={colors.textSecondary} value={search}
        onChangeText={value => { setSearch(value); setExportData(null); }} />
      <TouchableOpacity style={[styles.sortButton, { borderColor: colors.border }]} onPress={() => setDirection(value => value === 'desc' ? 'asc' : 'desc')}>
        <Icon name="sort-calendar-descending" size={19} color={colors.primary} /><Text style={{ color: colors.text }}>{direction === 'desc' ? 'Newest' : 'Oldest'}</Text>
      </TouchableOpacity>
    </View>
    <View style={[styles.exportBar, { backgroundColor: colors.surface }]}>
      <TouchableOpacity onPress={prepareExport} disabled={exporting} style={styles.prepare}>
        <Icon name="download-outline" size={20} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700' }}>
          {exporting ? `Preparing ${exportCount}…` : 'Prepare full export'}</Text>
      </TouchableOpacity>
      {exportData && <TripListExport data={exportData} />}
    </View>
    <Text style={[styles.hint, { color: colors.textSecondary }]}>Search covers loaded rows. Clear search and scroll to load more; export prepares the complete history.</Text>
    {!!error && <TouchableOpacity onPress={reload} style={styles.error}><Text style={{ color: '#b42318' }}>{error} Tap to retry.</Text></TouchableOpacity>}
    {loading ? <ActivityIndicator style={styles.center} size="large" color={colors.primary} /> :
      <FlatList data={visibleTrips} keyExtractor={item => item.id}
        renderItem={({ item }) => <TripCard trip={item} readOnly={readOnly} onEdit={trip => navigation.navigate('EditTrip', { tripId: trip.id })} onDelete={deleteTrip} />}
        onEndReached={loadMore} onEndReachedThreshold={0.4} onRefresh={reload} refreshing={loading}
        initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No trips found.</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        contentContainerStyle={styles.rows} />}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, hero: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 18 },
  back: { marginRight: 10 }, eyebrow: { color: '#d9eaff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 3 }, subtitle: { color: '#e5efff', fontSize: 12, marginTop: 5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 42 },
  exportBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 48 },
  prepare: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9 }, hint: { fontSize: 11, paddingHorizontal: 12, paddingVertical: 7 },
  error: { padding: 12 }, center: { flex: 1, justifyContent: 'center' }, empty: { padding: 24 }, footer: { padding: 16 }, rows: { paddingBottom: 24 },
});
