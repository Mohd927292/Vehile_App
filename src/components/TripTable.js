import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { tripService } from '../config/firebase';
import { useTheme } from '../hooks/useTheme';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDebounce } from '../hooks/useDebounce';
import { getWorkspaceId, LEGACY_WORKSPACE } from '../services/workspace';
import { exportTripReport } from '../services/reportExport';
import { reportAmount } from '../utils/tripReport';
import { loadRecords } from '../utils/loadRecords';

const imageIcons = {
  pdf: Icon.getImageSourceSync('file-pdf-box', 32, '#c62828'),
  excel: Icon.getImageSourceSync('microsoft-excel', 32, '#217346'),
};
export default function TripTable({ title, vehicleNo, partyId, month }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { readOnly } = useWorkspace();
  const scope = useRef(getWorkspaceId()).current;
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [error, setError] = useState('');
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [direction, setDirection] = useState('desc'),
    [sortField, setSortField] = useState('dateTimestamp');
  const [fromDate, setFrom] = useState(null),
    [toDate, setTo] = useState(null),
    [datePick, setDatePick] = useState(null),
    [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState(new Set()),
    [exportCount, setExportCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const pageStarts = useRef([null]),
    selectedRecords = useRef(new Map()),
    tableList = useRef(null);
  const cursor = useRef(null),
    generation = useRef(0),
    loadingMore = useRef(false),
    exportBusy = useRef(false);
  const queryText = useDebounce(search, 300);
  const options = useMemo(
    () => ({
      vehicleNo,
      partyId,
      month,
      direction,
      sortField,
      search: queryText,
      fromDate,
      toDate,
      workspaceId: scope,
    }),
    [
      vehicleNo,
      partyId,
      month,
      direction,
      sortField,
      queryText,
      fromDate,
      toDate,
      scope,
    ],
  );
  const page = useCallback(
    async nextCursor => {
      if (scope === LEGACY_WORKSPACE) {
        const result = await tripService.getTripPage({
          vehicleNo,
          direction,
          cursor: nextCursor,
          workspaceId: scope,
        });
        return {
          ...result,
          trips: result.trips
            .flatMap(trip => loadRecords(trip.id, trip))
            .filter(
              row =>
                (!partyId || row.partyId === partyId) &&
                (!month ||
                  row.date?.slice(-4) + '-' + row.date?.slice(3, 5) === month),
            ),
        };
      }
      return tripService.getLoadPage({ ...options, cursor: nextCursor });
    },
    [options, scope, vehicleNo, direction, partyId, month],
  );
  const reload = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError('');
    setSelected(new Set());
    selectedRecords.current.clear();
    setPageNumber(0);
    pageStarts.current = [null];
    cursor.current = null;
    try {
      const result = await page(null);
      if (id !== generation.current) return;
      setRows(result.trips);
      cursor.current = result.cursor;
      setMore(result.hasMore);
    } catch (failure) {
      if (id === generation.current) setError(failure.message);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [page]);
  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        generation.current++;
      };
    }, [reload]),
  );
  const goToPage = async target => {
    if (
      loading ||
      busy ||
      loadingMore.current ||
      target < 0 ||
      (target > pageNumber && !more)
    )
      return;
    loadingMore.current = true;
    setBusy(true);
    setError('');
    const id = generation.current;
    const start =
      target > pageNumber ? cursor.current : pageStarts.current[target];
    try {
      const result = await page(start);
      if (id !== generation.current) return;
      pageStarts.current[target] = start;
      setRows(result.trips);
      cursor.current = result.cursor;
      setMore(result.hasMore);
      setPageNumber(target);
      tableList.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (failure) {
      if (id === generation.current) setError(failure.message);
    } finally {
      loadingMore.current = false;
      setBusy(false);
    }
  };
  const selectLoaded = () => {
    for (const row of rows) selectedRecords.current.set(row.id, row);
    setSelected(new Set(selectedRecords.current.keys()));
  };
  const clearSelection = () => {
    selectedRecords.current.clear();
    setSelected(new Set());
  };
  const toggle = id => {
    if (selectedRecords.current.has(id)) selectedRecords.current.delete(id);
    else {
      const row = rows.find(item => item.id === id);
      if (row) selectedRecords.current.set(id, row);
    }
    setSelected(new Set(selectedRecords.current.keys()));
  };
  const exportFile = async format => {
    if (exportBusy.current || loading || search !== queryText) return;
    exportBusy.current = true;
    setBusy(true);
    setExportCount(0);
    try {
      let data = [...selectedRecords.current.values()];
      if (!selected.size) {
        let nextCursor = null,
          hasMore = true;
        data = [];
        while (hasMore) {
          const result = await page(nextCursor);
          data.push(...result.trips);
          setExportCount(data.length);
          nextCursor = result.cursor;
          hasMore = result.hasMore;
        }
      }
      await exportTripReport(data, title, format);
    } catch (failure) {
      Alert.alert('Export unavailable', failure.message);
    } finally {
      exportBusy.current = false;
      setBusy(false);
    }
  };
  const remove = row =>
    Alert.alert(
      'Archive vehicle trip',
      'This archives the vehicle trip and all its pairs. You can restore it from Archive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              await tripService.deleteTrip(row.tripId);
              await reload();
            } catch (failure) {
              Alert.alert('Archive failed', failure.message);
            }
          },
        },
      ],
    );
  const archiveSelected = () => {
    const tripIds = [
      ...new Set([...selectedRecords.current.values()].map(row => row.tripId)),
    ];
    Alert.alert(
      'Archive selected vehicle trips',
      `Archive ${tripIds.length} vehicle trip(s), including every pair in those trips? This can include pairs outside the current party filter. Restore them from Archive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            setBusy(true);
            let count = 0;
            try {
              for (const id of tripIds) {
                await tripService.deleteTrip(id);
                count++;
              }
            } catch (failure) {
              Alert.alert(
                'Archive stopped',
                `${count} trips archived. ${failure.message}`,
              );
            } finally {
              await reload();
              setBusy(false);
            }
          },
        },
      ],
    );
  };
  const widths = useMemo(
    () => [
      52,
      105,
      150,
      Math.max(
        140,
        ...rows.map(
          row =>
            Math.max(
              ...String(row.driverName || '')
                .split('\n')
                .map(line => line.length),
            ) *
              8 +
            24,
        ),
      ),
      ...['from', 'to'].map(field =>
        Math.max(
          220,
          ...rows.map(
            row =>
              Math.max(
                ...String(row[field] || '')
                  .split('\n')
                  .map(line => line.length),
              ) *
                13 +
              24,
          ),
        ),
      ),
      170,
      100,
    ],
    [rows],
  );
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const renderRow = ({ item, index }) => (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected.has(item.id) }}
      onLongPress={() => toggle(item.id)}
      onPress={() => selected.size && toggle(item.id)}
      style={[
        styles.row,
        {
          backgroundColor: selected.has(item.id)
            ? '#dcecff'
            : index % 2
            ? colors.background
            : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {[
        selected.has(item.id) ? '✓' : pageNumber * 40 + index + 1,
        item.date,
        item.vehicleNo,
        item.driverName,
        item.from,
        item.to,
        reportAmount(item),
      ].map((text, column) => (
        <Text
          key={column}
          style={[
            styles.cell,
            {
              width: widths[column],
              color: /\bNO LOAD\b/i.test(item.to || '')
                ? '#c2410c'
                : colors.text,
            },
          ]}
        >
          {text}
        </Text>
      ))}
      <View style={{ width: 100, flexDirection: 'row' }}>
        {!readOnly && (
          <>
            <TouchableOpacity
              accessibilityLabel="Edit vehicle trip"
              onPress={() =>
                navigation.navigate('EditTrip', { tripId: item.tripId })
              }
              style={styles.action}
            >
              <Icon name="pencil-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Archive vehicle trip"
              onPress={() => remove(item)}
              style={styles.action}
            >
              <Icon name="archive-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={{ color: 'white' }}>
            {month || 'All dates'} · Page {pageNumber + 1} · {rows.length}{' '}
            entries shown
          </Text>
        </View>
      </View>
      <View style={[styles.toolbar, { backgroundColor: colors.surface }]}>
        <TextInput
          accessibilityLabel="Search all entries"
          placeholder="Search all entries"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.search,
            { color: colors.text, borderColor: colors.border },
          ]}
          editable={scope !== LEGACY_WORKSPACE}
        />
        {['pdf', 'excel'].map(format => (
          <TouchableOpacity
            key={format}
            accessibilityLabel={`Export ${format.toUpperCase()}`}
            disabled={busy || loading || search !== queryText}
            onPress={() => exportFile(format)}
            style={styles.action}
          >
            <Image
              source={imageIcons[format]}
              style={{ width: 30, height: 30 }}
            />
            <Text style={{ fontSize: 10, color: colors.text }}>
              {format.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          accessibilityLabel="Sort entries"
          onPress={() => setSortOpen(true)}
          style={styles.action}
        >
          <Icon name="sort" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        style={{ maxHeight: 52 }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          disabled={scope === LEGACY_WORKSPACE}
          onPress={() => setDatePick('from')}
          style={styles.chip}
        >
          <Text style={{ color: colors.primary }}>
            {fromDate ? fromDate.toLocaleDateString('en-GB') : 'From date'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={scope === LEGACY_WORKSPACE}
          onPress={() => setDatePick('to')}
          style={styles.chip}
        >
          <Text style={{ color: colors.primary }}>
            {toDate ? toDate.toLocaleDateString('en-GB') : 'To date'}
          </Text>
        </TouchableOpacity>
        {(fromDate || toDate || search) && (
          <TouchableOpacity
            onPress={() => {
              setFrom(null);
              setTo(null);
              setSearch('');
            }}
          >
            <Text style={{ color: colors.primary }}>Clear filters</Text>
          </TouchableOpacity>
        )}
        {!selected.size && rows.length > 0 && (
          <TouchableOpacity onPress={selectLoaded}>
            <Text style={{ color: colors.primary }}>Select loaded rows</Text>
          </TouchableOpacity>
        )}
        {!!selected.size && (
          <>
            <TouchableOpacity onPress={selectLoaded}>
              <Text style={{ color: colors.primary }}>Select loaded</Text>
            </TouchableOpacity>
            {!readOnly && (
              <TouchableOpacity
                disabled={busy || loading}
                onPress={archiveSelected}
              >
                <Text style={{ color: colors.primary }}>
                  Archive selected trips
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={clearSelection}>
              <Text style={{ color: colors.primary }}>
                Clear {selected.size} selected
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          paddingHorizontal: 12,
          paddingBottom: 8,
        }}
      >
        One From → To pair per row · Hold a row to select · Search matches word
        beginnings
      </Text>
      {busy && (
        <Text style={{ padding: 8, color: colors.primary }}>
          {exportBusy.current
            ? `Preparing ${exportCount} entries…`
            : 'Loading…'}
        </Text>
      )}
      {!!error && (
        <TouchableOpacity onPress={reload}>
          <Text style={{ color: '#b42318', padding: 12 }}>{error} · Retry</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <ScrollView horizontal style={{ flex: 1 }}>
          <View style={{ width: totalWidth, flex: 1 }}>
            <View
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {[
                'SL',
                'Date',
                'Vehicle',
                'Driver',
                'From',
                'To',
                'Amount',
                'Actions',
              ].map((label, index) => (
                <Text
                  key={label}
                  style={[
                    styles.cell,
                    {
                      width: widths[index],
                      fontWeight: '700',
                      color: colors.text,
                    },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>
            <FlatList
              ref={tableList}
              data={rows}
              renderItem={renderRow}
              keyExtractor={item => item.id}
              onRefresh={reload}
              refreshing={loading}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
              ListEmptyComponent={
                <Text style={{ padding: 24, color: colors.text }}>
                  No matching entries.
                </Text>
              }
            />
          </View>
        </ScrollView>
      )}
      {!loading && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 12,
            paddingBottom: 24,
            backgroundColor: colors.surface,
          }}
        >
          <TouchableOpacity
            disabled={busy || pageNumber === 0}
            onPress={() => goToPage(pageNumber - 1)}
            accessibilityLabel="Previous page"
            style={styles.chip}
          >
            <Text
              style={{
                color:
                  busy || pageNumber === 0
                    ? colors.textSecondary
                    : colors.primary,
              }}
            >
              ← Previous
            </Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text, padding: 12 }}>
            Page {pageNumber + 1}
            {selected.size ? ` · ${selected.size} selected` : ''}
          </Text>
          <TouchableOpacity
            disabled={busy || !more}
            onPress={() => goToPage(pageNumber + 1)}
            accessibilityLabel="Next page"
            style={styles.chip}
          >
            <Text
              style={{
                color: busy || !more ? colors.textSecondary : colors.primary,
              }}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {datePick && (
        <DateTimePicker
          value={(datePick === 'from' ? fromDate : toDate) || new Date()}
          mode="date"
          onChange={(_event, value) => {
            const field = datePick;
            setDatePick(null);
            if (value) {
              value.setHours(
                field === 'from' ? 0 : 23,
                field === 'from' ? 0 : 59,
                field === 'from' ? 0 : 59,
                field === 'from' ? 0 : 999,
              );
              if (field === 'from') {
                setFrom(value);
                if (toDate && value > toDate) setTo(null);
              } else {
                setTo(value);
                if (fromDate && value < fromDate) setFrom(null);
              }
              setSortField('dateTimestamp');
            }
          }}
        />
      )}
      <Modal
        visible={sortOpen}
        transparent
        onRequestClose={() => setSortOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 22, color: colors.text }}>
              Sort entries
            </Text>
            {[
              ['dateTimestamp', 'Trip date'],
              ['createdAt', 'Entry created'],
              ['amount', 'Amount'],
            ].map(([field, label]) => (
              <TouchableOpacity
                key={field}
                disabled={
                  !!(
                    scope === LEGACY_WORKSPACE ||
                    month ||
                    fromDate ||
                    toDate
                  ) && field !== 'dateTimestamp'
                }
                onPress={() => {
                  setSortField(field);
                  setSortOpen(false);
                }}
                style={styles.chip}
              >
                <Text style={{ color: colors.primary }}>
                  {label}
                  {sortField === field ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.chip}
              onPress={() => {
                setDirection(value => (value === 'desc' ? 'asc' : 'desc'));
                setSortOpen(false);
              }}
            >
              <Text style={{ color: colors.primary }}>
                {direction === 'desc'
                  ? 'Descending ↓ — change to ascending'
                  : 'Ascending ↑ — change to descending'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSortOpen(false)}>
              <Text style={{ color: colors.primary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 50 },
  title: { fontSize: 24, color: 'white', fontWeight: '700' },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  search: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 },
  action: { padding: 9, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 52,
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 20,
  },
  chip: { paddingVertical: 12, paddingHorizontal: 8 },
  overlay: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    padding: 24,
  },
  modal: { borderRadius: 16, padding: 24 },
});
