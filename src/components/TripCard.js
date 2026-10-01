import React, { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';

const TripCard = ({ trip, onEdit, onDelete, readOnly = false }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const locations = trip.locations || [];
  const isNoLoad = locations.some(location => location?.to?.trim().toLowerCase() === 'no load');
  const createdAt = trip.createdAt instanceof Date
    ? trip.createdAt.toLocaleDateString()
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.heading}>
          <Text style={[styles.vehicle, { color: colors.text }]} numberOfLines={1}>{trip.vehicleNo || 'Vehicle unknown'}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{trip.date || 'Date unknown'}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.text }]} numberOfLines={1}>{trip.amount === '' || trip.amount == null ? '—' : trip.amount}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>Driver: {trip.driverName || '—'}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{locations.length} load{locations.length === 1 ? '' : 's'}</Text>
      </View>

      {isNoLoad && <Text style={styles.noLoad}>No load</Text>}

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(value => !value)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Hide' : 'Show'} route for ${trip.vehicleNo || 'trip'}`}
      >
        <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? 'Hide route' : 'View route'}</Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.route, { borderTopColor: colors.border }]}>
          {locations.length === 0 ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>No route recorded</Text>
          ) : locations.map((location, index) => (
            <View key={`${index}-${location?.from}-${location?.to}`} style={styles.routeRow}>
              <Text style={[styles.routeNumber, { color: colors.textSecondary }]}>{index + 1}.</Text>
              <Text style={[styles.routeText, { color: colors.text }]}>{location?.from || 'Unknown origin'} → {location?.to || 'Unknown destination'}</Text>
            </View>
          ))}
          {createdAt && <Text style={[styles.created, { color: colors.textSecondary }]}>Recorded {createdAt}</Text>}
        </View>
      )}

      {!readOnly && <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.action} onPress={() => onEdit(trip)} accessibilityRole="button" accessibilityLabel={`Edit trip ${trip.vehicleNo || ''}`}>
          <Icon name="pencil-outline" size={19} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => onDelete(trip.id)} accessibilityRole="button" accessibilityLabel={`Delete trip ${trip.vehicleNo || ''}`}>
          <Icon name="trash-can-outline" size={19} color="#c62828" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16, elevation: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  heading: { flex: 1 },
  vehicle: { fontSize: 17, fontWeight: '700' },
  date: { fontSize: 13, marginTop: 4 },
  amount: { fontSize: 17, fontWeight: '700', maxWidth: '42%' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  meta: { fontSize: 13, flexShrink: 1 },
  noLoad: { color: '#b71c1c', fontSize: 12, fontWeight: '700', marginTop: 8 },
  expandButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 14, minHeight: 36 },
  expandText: { fontSize: 14, fontWeight: '600' },
  route: { borderTopWidth: 1, paddingTop: 10, marginTop: 6 },
  routeRow: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  routeNumber: { width: 20, fontSize: 13 },
  routeText: { flex: 1, fontSize: 14 },
  created: { fontSize: 12, marginTop: 8 },
  actions: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, flexDirection: 'row', gap: 22 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  actionText: { fontSize: 14, fontWeight: '600' },
  deleteText: { color: '#c62828' },
});

export default memo(TripCard);
