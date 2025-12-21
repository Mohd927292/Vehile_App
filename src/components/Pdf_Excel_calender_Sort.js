import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Professional Action Bar for Trip List: Excel, PDF, Calendar, Sort
 */
const BUTTONS = [
  { key: 'excel', icon: 'microsoft-excel', color: '#388e3c', label: 'Export Excel' },
  { key: 'pdf', icon: 'file-pdf-box', color: '#d32f2f', label: 'Export PDF' },
  { key: 'calendar', icon: 'calendar-month', color: '#1976d2', label: 'Pick Date' },
  { key: 'sort', icon: 'sort', color: '#ff9800', label: 'Sort Data' },
];

const TripListExport = ({
  data,
  onExcelExport,
  onPDFExport,
  onCalendarPress,
  onSortPress,
}) => {
  // Map keys to provided handlers
  const handlers = {
    excel: onExcelExport
      ? () => onExcelExport(data)
      : () => Alert.alert('Export', 'Excel export! (Implement logic)'),
    pdf: onPDFExport
      ? () => onPDFExport(data)
      : () => Alert.alert('Export', 'PDF export! (Implement logic)'),
    calendar: onCalendarPress
      ? () => onCalendarPress()
      : () => Alert.alert('Calendar', 'Show date filter or picker modal!'),
    sort: onSortPress
      ? () => onSortPress()
      : () => Alert.alert('Sort', 'Sorting logic here!'),
  };

  return (
    <View style={styles.container}>
      {BUTTONS.map(({ key, icon, color, label }) => (
        <TouchableOpacity
          key={key}
          style={[styles.actionBtn, { backgroundColor: color }]}
          onPress={handlers[key]}
          activeOpacity={0.8}
          accessibilityLabel={label}
        >
          <Icon name={icon} size={26} color="#fff" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    
    paddingVertical: 5,
    borderRadius: 18,
    alignSelf: 'flex-end',
    gap: 5, // Modern spacing (RN 0.71+), else use margin on child
    
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Optional: subtle border for pop:
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});

export default TripListExport;
