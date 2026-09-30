import { useWorkspace } from '../../context/WorkspaceContext';
import { getWorkspaceId } from '../../services/workspace';
import React, { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { tripService, vehicleTripService } from '../../config/firebase';
import TripListExport from '../../components/Pdf_Excel_calender_Sort';
import { useTheme } from '../../hooks/useTheme';
import { filterTripsByQuery, matchingPartyLocations, parseTripDate } from '../../utils/tripData';

const widths = [100, 130, 130, 220, 120, 100];
const projectTrip = (trip, partyId, to) => {
  const locations = matchingPartyLocations(trip, { id: partyId, to });
  return { ...trip, locations, loadCount: locations.length,
    amount: (trip.locations || []).length === locations.length && trip.amount != null ? String(trip.amount) : 'Shared trip',
    createdAt: parseTripDate(trip.createdAt) };
};

export default function PartyList_Details_Screen() {
  const navigation = useNavigation();
  const { params = {} } = useRoute();
  const { partyId, to, month } = params;
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
    setLoading(true); setError(''); setExportData(null); setHasMore(false); cursor.current = null;
    try {
      const page = await vehicleTripService.getPartyTripPage({ partyId, to, month, direction, pageSize: 40 });
      if (id !== requestId.current) return;
      cursor.current = page.cursor;
      setTrips(page.trips.map(trip => projectTrip(trip, partyId, to)));
      setHasMore(page.hasMore);
    } catch (failure) {
      console.error('Party table query failed', failure);
      if (id === requestId.current) setError(failure.message || 'Unable to load trips.');
    } finally { if (id === requestId.current) setLoading(false); }
  }, [partyId, to, month, direction]);
  useFocusEffect(useCallback(() => { reload(); return () => { requestId.current += 1; }; }, [reload]));

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || !hasMore || !cursor.current || search.trim()) return;
    loadingMoreRef.current = true; setLoadingMore(true);
    const id = requestId.current;
    try {
      const page = await vehicleTripService.getPartyTripPage({ partyId, to, month, direction, cursor: cursor.current, pageSize: 40 });
      if (id !== requestId.current) return;
      cursor.current = page.cursor;
      setTrips(current => [...current, ...page.trips.map(trip => projectTrip(trip, partyId, to))]);
      setHasMore(page.hasMore);
    } catch (failure) {
      if (id === requestId.current) setError(failure.message || 'Unable to load more trips.');
    } finally { loadingMoreRef.current = false; setLoadingMore(false); }
  }, [loading, hasMore, partyId, to, month, direction, search]);

  const prepareExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true); setExportCount(0); setExportData(null);
    try {
      const workspaceId = getWorkspaceId();
      let nextCursor = null, all = [], more = true;
      while (more) {
        const page = await vehicleTripService.getPartyTripPage({ partyId, to, month, direction, cursor: nextCursor, pageSize: 100, workspaceId });
        all = all.concat(page.trips.map(trip => projectTrip(trip, partyId, to)));
        setExportCount(all.length);
        more = page.hasMore; nextCursor = page.cursor;
      }
      setExportData(filterTripsByQuery(all, search));
    } catch (failure) { Alert.alert('Export unavailable', failure.message || 'Could not prepare all trips.'); }
    finally { setExporting(false); }
  }, [partyId, to, month, direction, search, exporting]);

  const deleteTrip = tripId => Alert.alert('Delete trip', 'Move this trip to Archive? You can restore it later.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await tripService.deleteTrip(tripId); await reload(); }
      catch (failure) { Alert.alert('Delete failed', failure.message || 'Please try again.'); }
    } },
  ]);

  const row = ({ item, index }) => (
    <View style={[styles.row, { backgroundColor: index % 2 ? colors.background : colors.surface, borderBottomColor: colors.border }]}>
      {[item.date || '—', item.vehicleNo || '—', item.driverName || '—', item.locations.map(location => location.from || '—').join(', '), item.amount].map((value, column) =>
        <Text key={column} style={[styles.cell, { width: widths[column], color: colors.text, fontWeight: column === 1 ? '700' : '400' }]} numberOfLines={column === 3 ? 2 : 1}>{value}</Text>)}
      <View style={[styles.actions, { width: widths[5] }]}>{!readOnly && <>
        <TouchableOpacity onPress={() => navigation.navigate('EditTrip', { tripId: item.id })} accessibilityLabel={`Edit ${item.vehicleNo}`} style={styles.action}><Icon name="pencil-outline" size={20} color={colors.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => deleteTrip(item.id)} accessibilityLabel={`Delete ${item.vehicleNo}`} style={styles.action}><Icon name="trash-can-outline" size={20} color="#b42318" /></TouchableOpacity>
      </>}</View>
    </View>
  );

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.hero, { backgroundColor: colors.primary }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back to months" style={styles.back}><Icon name="chevron-left" size={28} color="#fff" /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.eyebrow}>{month || 'ALL HISTORY'}</Text><Text style={styles.title} numberOfLines={1}>{to}</Text>
        <Text style={styles.subtitle}>Only this party’s routes · {trips.length}{hasMore ? '+' : ''} trips loaded</Text></View>
    </View>
    <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TextInput style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        placeholder="Search loaded trips" placeholderTextColor={colors.textSecondary} value={search}
        onChangeText={value => { setSearch(value); setExportData(null); }} />
      <TouchableOpacity style={[styles.sort, { borderColor: colors.border }]} onPress={() => setDirection(value => value === 'desc' ? 'asc' : 'desc')}>
        <Icon name="sort-calendar-descending" size={19} color={colors.primary} /><Text style={{ color: colors.text }}>{direction === 'desc' ? 'Newest' : 'Oldest'}</Text></TouchableOpacity>
    </View>
    <View style={[styles.exportBar, { backgroundColor: colors.surface }]}>
      <TouchableOpacity onPress={prepareExport} disabled={exporting} style={styles.prepare}><Icon name="download-outline" size={20} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{exporting ? `Preparing ${exportCount}…` : 'Prepare full export'}</Text></TouchableOpacity>
      {exportData && <TripListExport data={exportData} />}
    </View>
    <Text style={[styles.hint, { color: colors.textSecondary }]}>Search covers loaded rows. Clear search and scroll to load more; export prepares complete {month ? 'month' : 'history'}.</Text>
    {!!error && <TouchableOpacity onPress={reload} style={styles.error}><Text style={{ color: '#b42318' }}>{error} Tap to retry.</Text></TouchableOpacity>}
    {loading ? <ActivityIndicator style={styles.center} size="large" color={colors.primary} /> :
      <ScrollView horizontal style={{ flex: 1 }}><View style={{ width: 800 }}>
        <View style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 2 }]}>
          {['Date', 'Vehicle', 'Driver', 'From', 'Amount', 'Actions'].map((label, index) => <Text key={label} style={[styles.cell, styles.heading, { width: widths[index], color: colors.textSecondary }]}>{label}</Text>)}
        </View>
        <FlatList data={visibleTrips} keyExtractor={item => item.id} renderItem={row} onEndReached={loadMore} onEndReachedThreshold={0.4}
          onRefresh={reload} refreshing={loading} initialNumToRender={16} maxToRenderPerBatch={16} windowSize={7} removeClippedSubviews
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No trips found for this party.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null} contentContainerStyle={styles.rows} />
      </View></ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, hero: { flexDirection: 'row', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 18 }, back: { marginRight: 9 },
  eyebrow: { color: '#d9eaff', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 3 },
  subtitle: { color: '#e5efff', fontSize: 12, marginTop: 5 }, toolbar: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderBottomWidth: 1 },
  search: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 42 },
  exportBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 48 },
  prepare: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9 }, hint: { fontSize: 11, paddingHorizontal: 12, paddingVertical: 7 },
  error: { padding: 12 }, row: { flexDirection: 'row', minHeight: 56, alignItems: 'center', borderBottomWidth: 1 },
  cell: { paddingHorizontal: 10, fontSize: 13 }, heading: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', justifyContent: 'space-around' }, action: { padding: 8 }, center: { flex: 1, justifyContent: 'center' },
  empty: { padding: 24 }, footer: { padding: 16 }, rows: { paddingBottom: 40 },
});
