import React from 'react';
import { useRoute } from '@react-navigation/native';
import TripTable from '../../components/TripTable';
export default function PartyDetails() { const { params = {} } = useRoute(); return <TripTable title={params.to || 'All parties'} partyId={params.partyId} month={params.month}/>; }
