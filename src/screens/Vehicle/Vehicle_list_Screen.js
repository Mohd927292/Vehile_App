import React from 'react';
import { useRoute } from '@react-navigation/native';
import PagedTripHistory from '../../components/PagedTripHistory';

export default function Vehicle_list_Screen() {
  const { vehicleNo } = useRoute().params || {};
  return <PagedTripHistory title={vehicleNo || 'Vehicle trips'} vehicleNo={vehicleNo} />;
}
