import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { vehicleTripService } from '../../config/firebase';
import { useTheme } from '../../hooks/useTheme';

const monthLabel = key => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export default function PartyMonthScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { partyId, to } = route.params || {};
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await vehicleTripService.getPartySummary(partyId);
      if (!result) throw new Error('Party was not found.');
      setSummary(result);
    } catch (failure) {
      setError(failure.message || 'Unable to load months.');
    } finally {
      setLoading(false);
    }
  }, [partyId]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const months = Object.entries(summary?.monthCounts || {})
    .filter(([key, count]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key) && Number(count) > 0)
    .sort(([a], [b]) => b.localeCompare(a));
  const open = month => navigation.navigate('PartyDetails', { partyId, to: summary?.to || to, month });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back to parties" style={styles.back}>
          <Icon name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>PARTY HISTORY</Text>
          <Text style={styles.title} numberOfLines={2}>{summary?.to || to}</Text>
          <Text style={styles.subtitle}>{summary?.loadCount || 0} loads across {months.length} {months.length === 1 ? 'month' : 'months'}</Text>
        </View>
      </View>
      {loading ? <ActivityIndicator style={styles.center} size="large" color={colors.primary} /> : error ? (
        <TouchableOpacity style={styles.center} onPress={reload}>
          <Text style={{ color: colors.text }}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={months}
          keyExtractor={item => item[0]}
          refreshing={loading}
          onRefresh={reload}
          ListHeaderComponent={
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => open(null)}>
              <Icon name="view-list-outline" size={24} color={colors.primary} />
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>All history</Text>
                <Text style={{ color: colors.textSecondary }}>Browse every trip in pages</Text>
              </View>
              <Icon name="chevron-right" size={23} color={colors.textSecondary} />
            </TouchableOpacity>
          }
          renderItem={({ item: [key, count] }) => (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => open(key)}>
              <Icon name="calendar-month-outline" size={24} color={colors.primary} />
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{monthLabel(key)}</Text>
                <Text style={{ color: colors.textSecondary }}>{count} load{count === 1 ? '' : 's'}</Text>
              </View>
              <Icon name="chevron-right" size={23} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, hero: { flexDirection: 'row', paddingHorizontal: 18, paddingTop: 50, paddingBottom: 24, alignItems: 'flex-start' },
  back: { marginRight: 12, paddingTop: 2 }, heroText: { flex: 1 },
  eyebrow: { color: '#d9eaff', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 25, fontWeight: '700', marginTop: 4 },
  subtitle: { color: '#e5efff', fontSize: 13, marginTop: 6 },
  list: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  cardText: { flex: 1, marginHorizontal: 14 }, cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  center: { flex: 1, justifyContent: 'center', alignSelf: 'center' },
});
