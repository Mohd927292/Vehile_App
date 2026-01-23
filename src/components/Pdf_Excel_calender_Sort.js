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
  Image,
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
  console.log('🔧 TripListExport initialized with:', {
    dataLength: data.length,
    hasOnDataChange: !!onDataChange,
    onDataChangeType: typeof onDataChange,
    allProps: Object.keys(arguments[0] || {})
  });
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

    // Handle YYYY-MM-DD format (new format)
    if (dateStr.includes('-') && dateStr.length === 10) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Handle DD/MM/YYYY format (legacy format)
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Fallback to standard Date parsing
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }, []);

  // Format date for display
  const formatDate = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }, []);

  // Filter data by date range
  const filterByDateRange = useCallback((trips, start, end) => {
    console.log('🗓️ CALENDAR FILTER:', { start, end, tripsCount: trips.length });
    if (!start || !end) {
      console.log('❌ No date range selected, returning all trips');
      return trips;
    }

    const filtered = trips.filter(trip => {
      const tripDate = parseDate(trip.date);
      if (!tripDate) {
        console.log('❌ Invalid trip date:', trip.date);
        return false;
      }

      const startDateObj = new Date(start);
      const endDateObj = new Date(end);

      // Set time to start/end of day for accurate comparison
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(23, 59, 59, 999);
      tripDate.setHours(0, 0, 0, 0); // Normalize trip date time

      const inRange = tripDate >= startDateObj && tripDate <= endDateObj;
      console.log('📅 Trip date check:', {
        originalDate: trip.date,
        tripDate: tripDate.toDateString(),
        startDate: startDateObj.toDateString(),
        endDate: endDateObj.toDateString(),
        inRange
      });

      return inRange;
    });

    console.log('✅ Calendar filtered trips:', filtered.length);
    return filtered;
  }, [parseDate]);

  // Sort data
  const sortData = useCallback((trips, field, order) => {
    console.log('🔄 SORT DATA:', { field, order, tripsCount: trips.length });
    if (!field) {
      console.log('❌ No sort field, returning original order');
      return trips;
    }

    const sorted = [...trips].sort((a, b) => {
      let aValue, bValue;

      if (field === 'date') {
        // Use dateTimestamp if available (better for sorting), fallback to date string
        if (a.dateTimestamp && b.dateTimestamp) {
          aValue = a.dateTimestamp.toDate ? a.dateTimestamp.toDate() : new Date(a.dateTimestamp);
          bValue = b.dateTimestamp.toDate ? b.dateTimestamp.toDate() : new Date(b.dateTimestamp);
          console.log('📅 Sorting by dateTimestamp:', {
            aTimestamp: a.dateTimestamp, aParsed: aValue?.toDateString(),
            bTimestamp: b.dateTimestamp, bParsed: bValue?.toDateString()
          });
        } else {
          aValue = parseDate(a.date);
          bValue = parseDate(b.date);
          console.log('📅 Sorting by date string:', {
            aDate: a.date, aParsed: aValue?.toDateString(),
            bDate: b.date, bParsed: bValue?.toDateString()
          });
        }
        // Handle null dates (put them at the end)
        if (!aValue && !bValue) return 0;
        if (!aValue) return 1;
        if (!bValue) return -1;
      } else if (field === 'createdAt') {
        // createdAt is already a Date object from Firestore
        aValue = a.createdAt instanceof Date ? a.createdAt : (a.createdAt ? new Date(a.createdAt) : null);
        bValue = b.createdAt instanceof Date ? b.createdAt : (b.createdAt ? new Date(b.createdAt) : null);
        console.log('⏰ Sorting by createdAt:', {
          aCreated: a.createdAt, aParsed: aValue?.toDateString(),
          bCreated: b.createdAt, bParsed: bValue?.toDateString()
        });
        // Handle null dates (put them at the end)
        if (!aValue && !bValue) return 0;
        if (!aValue) return 1;
        if (!bValue) return -1;
      } else {
        console.log('❌ Unknown sort field:', field);
        return 0;
      }

      const result = order === 'asc' ? aValue - bValue : bValue - aValue;
      console.log('🔢 Sort comparison result:', result);
      return result;
    });

    console.log('✅ Sorted trips count:', sorted.length);
    return sorted;
  }, [parseDate]);

  // Apply filters and sorting, then notify parent
  const applyFiltersAndSort = useCallback((trips, dateFilter = { start: startDate, end: endDate }, sort = sortConfig) => {
    console.log('🚀 APPLY FILTERS AND SORT:', {
      originalTripsCount: trips.length,
      dateFilter,
      sort,
      hasOnDataChange: !!onDataChange
    });

    let filtered = [...trips];

    // Apply date filter
    if (dateFilter.start && dateFilter.end) {
      console.log('📅 Applying date filter...');
      filtered = filterByDateRange(filtered, dateFilter.start, dateFilter.end);
    } else {
      console.log('⏭️ Skipping date filter (no date range)');
    }

    // Apply sorting
    if (sort.field) {
      console.log('🔄 Applying sort...');
      filtered = sortData(filtered, sort.field, sort.order);
    } else {
      console.log('⏭️ Skipping sort (no sort field)');
    }

    console.log('📊 Final result:', { finalCount: filtered.length });

    // Notify parent component
    if (onDataChange) {
      console.log('📤 Sending data to parent component');
      onDataChange(filtered);
    } else {
      console.log('❌ No onDataChange callback provided');
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
          'Amount': trip.amount || 'N/A',
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

      // Calculate maximum number of locations from all trips
      const maxLocations = Math.max(
        ...exportData.map(trip => (trip.locations && Array.isArray(trip.locations)) ? trip.locations.length : 0),
        1
      );

      // Generate dynamic location headers (From 1, To 1, From 2, To 2, etc.)
      const generateLocationHeaders = () => {
        let headers = '';
        for (let i = 0; i < maxLocations; i++) {
          const locationNum = i + 1;
          headers += `<th style="width: 6%;">From ${locationNum}</th><th style="width: 6%;">To ${locationNum}</th>`;
        }
        return headers;
      };

      // Generate HTML table for PDF with dynamic location columns
      const generateTableRows = () => {
        return exportData.map((trip, index) => {
          // Generate location cells based on max locations
          let locationCells = '';
          if (trip.locations && Array.isArray(trip.locations)) {
            for (let i = 0; i < maxLocations; i++) {
              const location = trip.locations[i];
              const from = location ? (location.from || '') : '';
              const to = location ? (location.to || '') : '';
              locationCells += `<td>${from}</td><td>${to}</td>`;
            }
          } else {
            // If no locations, fill with empty cells
            for (let i = 0; i < maxLocations; i++) {
              locationCells += `<td></td><td></td>`;
            }
          }

          const createdAt = trip.createdAt
            ? new Date(trip.createdAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
            : '';

          return `
            <tr>
              <td style="text-align: center; font-weight: 500;">${index + 1}</td>
              <td>${trip.date || ''}</td>
              <td>${trip.vehicleNo || ''}</td>
              <td>${trip.driverName || ''}</td>
              <td style="text-align: center;">${trip.amount || '-'}</td>
              ${locationCells}
              <td style="text-align: center;">${trip.loadCount || 0}</td>
              <td style="font-size: 9px;">${createdAt}</td>
            </tr>
          `;
        }).join('');
      };

      const reportDate = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Read signature image as base64
      let signatureBase64 = '';
      try {
        // Use Image.resolveAssetSource to get the proper asset path
        const signatureAsset = require('../../assets/images/SIGN.png');
        const signPath = signatureAsset.uri;

        console.log('🔍 Checking for signature at:', signPath);
        const exists = await RNFS.exists(signPath);

        if (exists) {
          signatureBase64 = await RNFS.readFile(signPath, 'base64');
          console.log('✅ Signature loaded successfully');
        } else {
          console.warn('⚠️ Signature file not found at:', signPath);
        }
      } catch (e) {
        console.warn('⚠️ Could not load signature:', e.message);
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Trip Ticket & Cash Credit Bill</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                padding: 8px;
                background-color: #fff;
                margin: 4px;
              }
              .document {
                border: 3px solid #6e6d6d;
              }
              
              /* HEADER */
              .header {
                border-bottom: 3px solid #000;
                padding: 12px 10px;
                text-align: center;
                background-color: #fff;
              }
              .company-name {
                font-size: 22px;
                font-weight: 900;
                color: #2d5016;
                margin-bottom: 3px;
                letter-spacing: 0.5px;
              }
              .company-details {
                font-size: 9px;
                color: #333;
                line-height: 1.3;
                margin-bottom: 2px;
              }
              .company-address {
                font-size: 8px;
                color: #333;
                line-height: 1.2;
              }
              
              /* BILL TITLE */
              .bill-title {
                border-bottom: 3px solid #000;
                padding: 8px;
                text-align: center;
                font-size: 13px;
                font-weight: 700;
                background-color: #f0f0f0;
              }
              
              /* DATA SECTION */
              .data-section {
                padding: 8px;
                border-bottom: 3px solid #000;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
              }
              thead {
                background-color: #4472c4;
                color: white;
              }
              th {
                border: 1px solid #000;
                padding: 6px 4px;
                text-align: center;
                font-weight: 600;
                font-size: 9px;
                text-transform: uppercase;
              }
              td {
                border: 1px solid #ccc;
                padding: 5px 4px;
                font-size: 9px;
                color: #333;
              }
              tbody tr:nth-child(odd) {
                background-color: #f9f9f9;
              }
              tbody tr:nth-child(even) {
                background-color: #fff;
              }
              
              /* FOOTER */
              .footer {
                display: flex;
                padding: 12px;
                gap: 20px;
              }
              
              .remark-box {
                flex: 1;
              }
              .remark-label {
                font-weight: 700;
                font-size: 11px;
                color: #d32f2f;
                margin-bottom: 3px;
              }
              .remark-field {
                border: 1px solid #999;
                min-height: 35px;
                background-color: #f9f9f9;
              }
              
              .signature-box {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .signature-image {
                max-width: 80px;
                max-height: 50px;
                margin-bottom: 3px;
              }
              .signature-text {
                font-size: 9px;
                font-weight: 600;
                color: #333;
                margin-bottom: 2px;
              }
              .signature-subtext {
                font-size: 8px;
                color: #555;
              }
            </style>
          </head>
          <body>
            <div class="document">
              <!-- HEADER -->
              <div class="header">
              <div class="company-name">RNA SERVICES</div>
               
                <div class="company-details">GSTIN:29AYLPR9800N1ZH/EMAIL:92RNASERVICES@GMAIL.COM / Ph. 9241598450/9845301473</div>
                <div class="company-address">No. 73, 1st Main Road, 17th Cross, Bapujinagar, Mysore Road, Bangalore-560026, Karnataka, India.</div>
              </div>

              <!-- TITLE -->
              <div class="bill-title">TRIP DETAILS</div>

              <!-- DATA SECTION -->
              <div class="data-section">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 3%;">Sr</th>
                      <th style="width: 8%;">Date</th>
                      <th style="width: 7%;">Vehicle</th>
                      <th style="width: 8%;">Driver</th>
                      <th style="width: 6%;">Amount</th>
                      ${generateLocationHeaders()}
                      <th style="width: 5%; text-align: center;">Loads</th>
                      <th style="width: 8%;">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${generateTableRows()}
                  </tbody>
                </table>
              </div>

              <!-- FOOTER -->
              <div class="footer">
                <div class="remark-box">
                  <div class="remark-label">REMARK:</div>
            
                </div>
               
              </div>
            </div>
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
    console.log('📅 APPLY DATE FILTER:', { selectedStartDate, selectedEndDate });

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
    console.log('🎯 Applying calendar filter with data:', data.length, 'trips');
    applyFiltersAndSort(data, { start: selectedStartDate, end: selectedEndDate }, sortConfig);
    setShowCalendarModal(false);
    Alert.alert('Filter Applied', `Showing trips from ${selectedStartDate} to ${selectedEndDate}`);
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

  // Handle sort selection (just update the config, don't apply immediately)
  const handleSort = useCallback((field) => {
    const newOrder = sortConfig.field === field && sortConfig.order === 'asc'
      ? 'desc'
      : 'asc';

    setSortConfig({ field, order: newOrder });
  }, [sortConfig]);

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
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Sort</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={22} color="#444" />
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Current selection</Text>
              <Text style={styles.summaryValue}>
                {sortConfig.field
                  ? `${sortConfig.field === 'date' ? 'Date' : 'Created At'} · ${sortConfig.order === 'asc' ? 'Ascending' : 'Descending'
                  }`
                  : 'None'}
              </Text>
            </View>

            {/* Sort Field */}
            <Text style={styles.sectionTitle}>Sort by</Text>

            {[
              { key: 'date', label: 'Date' },
              { key: 'createdAt', label: 'Created At' },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                style={styles.radioRow}
                onPress={() => handleSort(item.key)}
              >
                <View style={styles.radioOuter}>
                  {sortConfig.field === item.key && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Order */}
            <Text style={styles.sectionTitle}>Order</Text>

            <View style={styles.segment}>
              {[
                { key: 'asc', label: 'Ascending' },
                { key: 'desc', label: 'Descending' },
              ].map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.segmentButton,
                    sortConfig.order === item.key && styles.segmentActive,
                  ]}
                  onPress={() =>
                    setSortConfig(prev => ({ ...prev, order: item.key }))
                  }
                >
                  <Text
                    style={[
                      styles.segmentText,
                      sortConfig.order === item.key && styles.segmentTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={clearSort}>
                <Text style={styles.clearText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  console.log('🔄 APPLY SORT BUTTON PRESSED:', sortConfig);
                  if (sortConfig.field) {
                    console.log('🎯 Applying sort with data:', data.length, 'trips');
                    applyFiltersAndSort(data, { start: startDate, end: endDate }, sortConfig);
                    Alert.alert('Sort Applied', `Sorted by ${sortConfig.field} (${sortConfig.order})`);
                  } else {
                    console.log('❌ No sort field selected');
                    Alert.alert('No Sort Selected', 'Please select a field to sort by');
                  }
                  setShowSortModal(false);
                }}
              >
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },

  summary: {
    backgroundColor: '#f6f8fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },

  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976d2',
  },

  radioLabel: {
    fontSize: 15,
    color: '#111',
  },

  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },

  segmentActive: {
    backgroundColor: '#1976d2',
  },

  segmentText: {
    fontSize: 14,
    color: '#444',
  },

  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },

  clearText: {
    color: '#555',
    fontSize: 14,
  },

  applyButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },

  applyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
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
    marginVertical: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976d2',
    letterSpacing: 0.5,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976d2',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  calendarDay: {
    width: '13.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 8,
  },
  calendarDayInRange: {
    backgroundColor: '#e3f2fd',
  },
  calendarDayStart: {
    backgroundColor: '#1976d2',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  calendarDayEnd: {
    backgroundColor: '#1976d2',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976d2',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRangeInfo: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  dateRangeText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },

  calendarDayText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  calendarDayTextDisabled: {
    color: '#bdbdbd',
    fontWeight: '300',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: '#1976d2',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 8,
    paddingHorizontal: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  clearButton: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  clearButtonText: {
    color: '#ff9800',
    fontWeight: '600',
    fontSize: 15,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#fff3e0',
  },
  calendarDayText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  calendarDayTextDisabled: {
    color: '#bdbdbd',
    fontWeight: '300',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: '#1976d2',
    fontWeight: '700',
  },
})

export default TripListExport;

