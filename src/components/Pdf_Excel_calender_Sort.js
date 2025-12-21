import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Text,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';
import Share from 'react-native-share';

// Import PDF module - it exports generatePDF function
import { generatePDF } from 'react-native-html-to-pdf';

// Check if module is available
const isPDFModuleAvailable = () => {
  return generatePDF && typeof generatePDF === 'function';
};

/**
 * Professional Action Bar for Trip List: Excel, PDF, Calendar, Sort
 * 
 * Props:
 * @param {Array} data - Array of trip objects to export/filter/sort
 * @param {Function} onDataChange - Callback when filtered/sorted data changes: (newData) => void
 * @param {Function} onExcelExport - Optional custom Excel export handler
 * @param {Function} onPDFExport - Optional custom PDF export handler
 */
const BUTTONS = [
  { key: 'excel', icon: 'microsoft-excel', color: '#388e3c', label: 'Export Excel' },
  { key: 'pdf', icon: 'file-pdf-box', color: '#d32f2f', label: 'Export PDF' },
  { key: 'calendar', icon: 'calendar-month', color: '#1976d2', label: 'Pick Date' },
  { key: 'sort', icon: 'sort', color: '#ff9800', label: 'Sort Data' },
];

const TripListExport = ({
  data = [],
  onDataChange,
  onExcelExport,
  onPDFExport,
}) => {
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: null, order: 'asc' });
  const [isExporting, setIsExporting] = useState(false);

  // Convert date string to Date object for comparison
  const parseDate = useCallback((dateStr) => {
    if (!dateStr || dateStr === 'N/A') return null;
    // Handle various date formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      return null;
    }
    return date;
  }, []);

  // Format date for display
  const formatDate = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }, []);

  // Filter data by date range
  const filterByDateRange = useCallback((trips, start, end) => {
    if (!start || !end) return trips;
    
    return trips.filter(trip => {
      const tripDate = parseDate(trip.date);
      if (!tripDate) return false;
      
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      
      // Set time to start/end of day for accurate comparison
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(23, 59, 59, 999);
      tripDate.setHours(12, 0, 0, 0);
      
      return tripDate >= startDateObj && tripDate <= endDateObj;
    });
  }, [parseDate]);

  // Sort data
  const sortData = useCallback((trips, field, order) => {
    if (!field) return trips;
    
    const sorted = [...trips].sort((a, b) => {
      let aValue, bValue;
      
      if (field === 'date') {
        aValue = parseDate(a.date);
        bValue = parseDate(b.date);
        if (!aValue) return 1;
        if (!bValue) return -1;
      } else if (field === 'createdAt') {
        aValue = a.createdAt ? new Date(a.createdAt) : null;
        bValue = b.createdAt ? new Date(b.createdAt) : null;
        if (!aValue) return 1;
        if (!bValue) return -1;
      } else {
        return 0;
      }
      
      if (order === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    return sorted;
  }, [parseDate]);

  // Apply filters and sorting, then notify parent
  const applyFiltersAndSort = useCallback((trips, dateFilter = { start: startDate, end: endDate }, sort = sortConfig) => {
    let filtered = [...trips];
    
    // Apply date filter
    if (dateFilter.start && dateFilter.end) {
      filtered = filterByDateRange(filtered, dateFilter.start, dateFilter.end);
    }
    
    // Apply sorting
    if (sort.field) {
      filtered = sortData(filtered, sort.field, sort.order);
    }
    
    // Notify parent component
    if (onDataChange) {
      onDataChange(filtered);
    }
    
    return filtered;
  }, [startDate, endDate, sortConfig, filterByDateRange, sortData, onDataChange]);

  // Note: Filters are only applied when user explicitly sets them via the modals
  // Initial data is passed through onDataChange on first render if no filters are set
  React.useEffect(() => {
    if (onDataChange && !startDate && !sortConfig.field) {
      // If no filters are set, pass original data
      onDataChange(data || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Excel Export Helper
  const exportToExcel = useCallback(async (exportData) => {
    if (!exportData || exportData.length === 0) {
      Alert.alert('Error', 'No data to export');
      return;
    }

    try {
      setIsExporting(true);
      
      // Prepare data for Excel
      const excelData = exportData.map((trip, index) => {
        const row = {
          'Sr No': index + 1,
          'Date': trip.date || 'N/A',
          'Vehicle No': trip.vehicleNo || 'N/A',
          'Driver Name': trip.driverName || 'N/A',
        };
        
        // Add location columns dynamically
        if (trip.locations && Array.isArray(trip.locations)) {
          trip.locations.forEach((loc, idx) => {
            row[`From ${idx + 1}`] = loc.from || 'N/A';
            row[`To ${idx + 1}`] = loc.to || 'N/A';
          });
        }
        
        row['Load Count'] = trip.loadCount || 'N/A';
        row['Created At'] = trip.createdAt 
          ? new Date(trip.createdAt).toLocaleString() 
          : 'N/A';
        
        return row;
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trip Report');

      // Generate Excel file buffer
      const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
      
      // Convert to base64
      const base64 = btoa(
        wbout
          .split('')
          .map(c => String.fromCharCode(c.charCodeAt(0) & 0xff))
          .join('')
      );

      // Create temporary file for sharing
      const fileName = `TripReport_${new Date().getTime()}.xlsx`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      
      // Write to temporary cache directory
      await RNFS.writeFile(filePath, base64, 'base64');
      
      // Share directly without alert
      const shareOptions = {
        title: 'Share Excel File',
        url: Platform.OS === 'ios' ? `file://${filePath}` : `file://${filePath}`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: fileName,
      };
      
      await Share.open(shareOptions);
      
      // Clean up temporary file after sharing
      try {
        await RNFS.unlink(filePath);
      } catch (unlinkError) {
        // Ignore cleanup errors
        console.log('Cleanup error (non-critical):', unlinkError);
      }
      
      setIsExporting(false);
    } catch (error) {
      setIsExporting(false);
      if (error.message !== 'User did not share') {
        console.error('Excel export error:', error);
        Alert.alert('Error', 'Failed to export Excel file. Please try again.');
      }
    }
  }, []);

  // PDF Export Helper
  const exportToPDF = useCallback(async (exportData) => {
    if (!exportData || exportData.length === 0) {
      Alert.alert('Error', 'No data to export');
      return;
    }

    // Check if PDF module is available
    if (!isPDFModuleAvailable()) {
      Alert.alert(
        'Error',
        'PDF export module is not available. Please ensure react-native-html-to-pdf is properly installed and linked. You may need to rebuild the app.'
      );
      return;
    }

    try {
      setIsExporting(true);

      // Generate HTML table for PDF
      const generateTableRows = () => {
        return exportData.map((trip, index) => {
          const locationsHtml = trip.locations && Array.isArray(trip.locations)
            ? trip.locations.map((loc, idx) => 
                `<td>${loc.from || 'N/A'}</td><td>${loc.to || 'N/A'}</td>`
              ).join('')
            : '<td>N/A</td><td>N/A</td>';
          
          const createdAt = trip.createdAt 
            ? new Date(trip.createdAt).toLocaleString() 
            : 'N/A';
          
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${trip.date || 'N/A'}</td>
              <td>${trip.vehicleNo || 'N/A'}</td>
              <td>${trip.driverName || 'N/A'}</td>
              ${locationsHtml}
              <td>${trip.loadCount || 'N/A'}</td>
              <td>${createdAt}</td>
            </tr>
          `;
        }).join('');
      };

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Trip Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
              }
              h1 {
                color: #1976d2;
                text-align: center;
                margin-bottom: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                font-size: 10px;
              }
              th {
                background-color: #1976d2;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
              .header-row {
                background-color: #333;
                color: white;
              }
            </style>
          </head>
          <body>
            <h1>Trip Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Records: ${exportData.length}</p>
            <table>
              <thead>
                <tr class="header-row">
                  <th>Sr No</th>
                  <th>Date</th>
                  <th>Vehicle No</th>
                  <th>Driver Name</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Load Count</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${generateTableRows()}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Generate PDF to cache directory
      const fileName = `TripReport_${new Date().getTime()}.pdf`;
      
      const options = {
        html: html,
        fileName: fileName.replace('.pdf', ''),
        directory: 'Cache',
        base64: false,
      };
      
      const file = await generatePDF(options);
      
      // Use the file path from the result
      let originalPdfPath = file?.filePath || file?.uri || file?.path;
      
      if (!originalPdfPath) {
        console.error('PDF generation result:', JSON.stringify(file, null, 2));
        throw new Error('PDF file path not generated. File object: ' + JSON.stringify(file));
      }
      
      // Remove file:// prefix if present
      let sourcePath = originalPdfPath.replace(/^file:\/\//, '');
      
      // Verify source file exists
      const sourceExists = await RNFS.exists(sourcePath);
      if (!sourceExists) {
        console.error('Source PDF file not found:', sourcePath);
        throw new Error(`PDF file not found at path: ${sourcePath}`);
      }
      
      // Copy to our cache directory to ensure consistent path format (like Excel export)
      const cacheFilePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.copyFile(sourcePath, cacheFilePath);
      
      // Verify copied file exists
      const copiedExists = await RNFS.exists(cacheFilePath);
      if (!copiedExists) {
        throw new Error(`Failed to copy PDF file to cache: ${cacheFilePath}`);
      }
      
      // Use the cache file path for sharing
      const absolutePath = cacheFilePath;
      
      // Verify URI is not null/empty before sharing
      if (!absolutePath) {
        throw new Error(`Invalid file path: ${absolutePath}`);
      }
      
      // Try different approaches for Android vs iOS
      let shareOptions;
      if (Platform.OS === 'android') {
        // For Android, try using the path directly or with file:// prefix
        // react-native-share should handle the URI conversion
        shareOptions = {
          title: 'Share PDF File',
          message: 'Trip Report PDF',
          url: `file://${absolutePath}`,
          type: 'application/pdf',
        };
      } else {
        // iOS
        shareOptions = {
          title: 'Share PDF File',
          url: `file://${absolutePath}`,
          type: 'application/pdf',
          filename: fileName,
        };
      }
      
      // Log for debugging
      console.log('Sharing PDF:', {
        originalPath: originalPdfPath,
        sourcePath: sourcePath,
        cacheFilePath: cacheFilePath,
        absolutePath: absolutePath,
        sourceExists: sourceExists,
        copiedExists: copiedExists,
      });
      
      await Share.open(shareOptions);
      
      // Clean up temporary files after sharing
      try {
        // Remove the copied cache file
        if (absolutePath && await RNFS.exists(absolutePath)) {
          await RNFS.unlink(absolutePath);
        }
        // Also try to remove original file if it's different
        if (sourcePath && sourcePath !== absolutePath && await RNFS.exists(sourcePath)) {
          await RNFS.unlink(sourcePath);
        }
      } catch (unlinkError) {
        // Ignore cleanup errors
        console.log('Cleanup error (non-critical):', unlinkError);
      }
      
      setIsExporting(false);
    } catch (error) {
      setIsExporting(false);
      if (error.message !== 'User did not share') {
        console.error('PDF export error:', error);
        Alert.alert('Error', 'Failed to export PDF file. Please try again.');
      }
    }
  }, []);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get days in month
  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return { days, year, month };
  }, []);

  // Format date as YYYY-MM-DD
  const formatDateString = useCallback((year, month, day) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  }, []);

  // Check if date is in selected range
  const isDateInRange = useCallback((dateStr) => {
    if (!selectedStartDate) return false;
    if (selectedStartDate && !selectedEndDate) {
      return dateStr === selectedStartDate;
    }
    return dateStr >= selectedStartDate && dateStr <= selectedEndDate;
  }, [selectedStartDate, selectedEndDate]);

  // Check if date is start date
  const isStartDate = useCallback((dateStr) => {
    return dateStr === selectedStartDate;
  }, [selectedStartDate]);

  // Check if date is end date
  const isEndDate = useCallback((dateStr) => {
    return dateStr === selectedEndDate;
  }, [selectedEndDate]);

  // Handle date selection on calendar
  const handleDayPress = useCallback((day, month, year) => {
    const dateStr = formatDateString(year, month, day);
    const today = new Date();
    const selectedDate = new Date(year, month, day);
    
    // Don't allow future dates
    if (selectedDate > today) return;
    
    // If no start date selected, or both dates selected, start fresh
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateStr);
      setSelectedEndDate(null);
    } 
    // If start date selected but not end date
    else if (selectedStartDate && !selectedEndDate) {
      // If selected date is before start date, make it the new start date
      if (dateStr < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(dateStr);
      } else {
        setSelectedEndDate(dateStr);
      }
    }
  }, [selectedStartDate, selectedEndDate, formatDateString]);

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }, [currentMonth]);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const today = new Date();
    // Don't allow navigating to future months
    if (nextMonth <= today) {
      setCurrentMonth(nextMonth);
    }
  }, [currentMonth]);

  // Open calendar modal and initialize selected dates
  const openCalendarModal = useCallback(() => {
    // Initialize with current selected dates or null
    setSelectedStartDate(startDate || null);
    setSelectedEndDate(endDate || null);
    // Set current month to today's month
    setCurrentMonth(new Date());
    setShowCalendarModal(true);
  }, [startDate, endDate]);

  // Apply date filter
  const applyDateFilter = useCallback(() => {
    if (!selectedStartDate || !selectedEndDate) {
      Alert.alert('Invalid Selection', 'Please select both start and end dates');
      return;
    }
    
    if (selectedEndDate < selectedStartDate) {
      Alert.alert('Invalid Range', 'End date must be after start date');
      return;
    }
    
    setStartDate(selectedStartDate);
    setEndDate(selectedEndDate);
    applyFiltersAndSort(data, { start: selectedStartDate, end: selectedEndDate }, sortConfig);
    setShowCalendarModal(false);
   // Alert.alert('Filter Applied', `Showing trips from ${selectedStartDate} to ${selectedEndDate}`);
  }, [selectedStartDate, selectedEndDate, data, sortConfig, applyFiltersAndSort]);

  // Cancel date filter (close modal without applying)
  const cancelDateFilter = useCallback(() => {
    // Reset to original selected dates
    setSelectedStartDate(startDate || null);
    setSelectedEndDate(endDate || null);
    setShowCalendarModal(false);
  }, [startDate, endDate]);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    applyFiltersAndSort(data, { start: null, end: null }, sortConfig);
    setShowCalendarModal(false);
    Alert.alert('Filter Cleared', 'All trips are now visible');
  }, [data, sortConfig, applyFiltersAndSort]);

  // Handle sort selection
  const handleSort = useCallback((field) => {
    const newOrder = sortConfig.field === field && sortConfig.order === 'asc' 
      ? 'desc' 
      : 'asc';
    
    const newSortConfig = { field, order: newOrder };
    setSortConfig(newSortConfig);
    
    applyFiltersAndSort(data, { start: startDate, end: endDate }, newSortConfig);
    setShowSortModal(false);
    
    Alert.alert(
      'Sorted',
      `Sorted by ${field} (${newOrder === 'asc' ? 'Ascending' : 'Descending'})`
    );
  }, [sortConfig, data, startDate, endDate, applyFiltersAndSort]);

  // Clear sort
  const clearSort = useCallback(() => {
    setSortConfig({ field: null, order: 'asc' });
    applyFiltersAndSort(data, { start: startDate, end: endDate }, { field: null, order: 'asc' });
    setShowSortModal(false);
    Alert.alert('Sort Cleared', 'Default order restored');
  }, [data, startDate, endDate, applyFiltersAndSort]);

  // Button handlers
  const handlers = {
    excel: onExcelExport 
      ? () => onExcelExport(data)
      : () => exportToExcel(data),
    pdf: onPDFExport
      ? () => onPDFExport(data)
      : () => exportToPDF(data),
    calendar: openCalendarModal,
    sort: () => setShowSortModal(true),
  };

  return (
    <>
      <View style={styles.container}>
        {isExporting && (
          <View style={styles.exportingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
        {BUTTONS.map(({ key, icon, color, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.actionBtn, { backgroundColor: color }]}
            onPress={handlers[key]}
            activeOpacity={0.8}
            accessibilityLabel={label}
            disabled={isExporting}
          >
            <Icon name={icon} size={26} color="#fff" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendar Date Range Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelDateFilter}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={cancelDateFilter}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarContainer}>
              {/* Calendar Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={goToPreviousMonth}
                  style={styles.calendarNavButton}
                >
                  <Icon name="chevron-left" size={24} color="#1976d2" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  onPress={goToNextMonth}
                  style={styles.calendarNavButton}
                  disabled={
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) >
                    new Date()
                  }
                >
                  <Icon
                    name="chevron-right"
                    size={24}
                    color={
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) >
                      new Date()
                        ? '#ccc'
                        : '#1976d2'
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Calendar Week Days */}
              <View style={styles.calendarWeekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.weekDay}>
                    <Text style={styles.weekDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Days Grid */}
              <View style={styles.calendarDaysGrid}>
                {(() => {
                  const { days, year, month } = getDaysInMonth(currentMonth);
                  const today = new Date();
                  const todayStr = formatDateString(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );

                  return days.map((day, index) => {
                    if (day === null) {
                      return <View key={`empty-${index}`} style={styles.calendarDay} />;
                    }

                    const dateStr = formatDateString(year, month, day);
                    const dateObj = new Date(year, month, day);
                    dateObj.setHours(0, 0, 0, 0);
                    const todayDate = new Date(today);
                    todayDate.setHours(0, 0, 0, 0);
                    const isFuture = dateObj > todayDate;
                    const isToday = dateStr === todayStr;
                    const inRange = isDateInRange(dateStr);
                    const isStart = isStartDate(dateStr);
                    const isEnd = isEndDate(dateStr);

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[
                          styles.calendarDay,
                          inRange && styles.calendarDayInRange,
                          isStart && styles.calendarDayStart,
                          isEnd && styles.calendarDayEnd,
                          isToday && styles.calendarDayToday,
                        ]}
                        onPress={() => handleDayPress(day, month, year)}
                        disabled={isFuture}
                      >
                        <Text
                          style={[
                          styles.calendarDayText,
                          isFuture && styles.calendarDayTextDisabled,
                          (isStart || isEnd) && styles.calendarDayTextSelected,
                          isToday && styles.calendarDayTextToday,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            </View>

            <View style={styles.dateRangeInfo}>
              <Text style={styles.dateRangeText}>
                {!selectedStartDate
                  ? 'Select start date'
                  : !selectedEndDate
                  ? `Start: ${selectedStartDate} - Select end date`
                  : `Selected Range: ${selectedStartDate} to ${selectedEndDate}`}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDateFilter}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.clearButton,
                  { marginHorizontal: 5 },
                ]}
                onPress={clearDateFilter}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.applyButton,
                  (!selectedStartDate || !selectedEndDate) && styles.disabledButton,
                ]}
                onPress={applyDateFilter}
                disabled={!selectedStartDate || !selectedEndDate}
              >
                <Text style={styles.applyButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Data</Text>
              <TouchableOpacity
                onPress={() => setShowSortModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sortOptions}>
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortConfig.field === 'date' && styles.sortOptionActive,
                ]}
                onPress={() => handleSort('date')}
              >
                <Text style={styles.sortOptionText}>Sort by Date</Text>
                {sortConfig.field === 'date' && (
                  <Icon
                    name={sortConfig.order === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color="#1976d2"
                  />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortConfig.field === 'createdAt' && styles.sortOptionActive,
                ]}
                onPress={() => handleSort('createdAt')}
              >
                <Text style={styles.sortOptionText}>Sort by Created At</Text>
                {sortConfig.field === 'createdAt' && (
                  <Icon
                    name={sortConfig.order === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color="#1976d2"
                  />
                )}
              </TouchableOpacity>
              
              {sortConfig.field && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.clearButton, { marginTop: 20 }]}
                  onPress={clearSort}
                >
                  <Text style={styles.clearButtonText}>Clear Sort</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderRadius: 18,
    alignSelf: 'flex-end',
    gap: 5,
    position: 'relative',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  dateRangeInfo: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButton: {
    backgroundColor: '#1976d2',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  sortOptions: {
    marginTop: 10,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sortOptionActive: {
    borderColor: '#1976d2',
    backgroundColor: '#e3f2fd',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  calendarContainer: {
    marginVertical: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  calendarNavButton: {
    padding: 5,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarDayInRange: {
    backgroundColor: '#e3f2fd',
  },
  calendarDayStart: {
    backgroundColor: '#1976d2',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  calendarDayEnd: {
    backgroundColor: '#1976d2',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  calendarDayTextDisabled: {
    color: '#d9e1e8',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendarDayTextToday: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});

export default TripListExport;


