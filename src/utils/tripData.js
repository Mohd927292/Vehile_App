export const partyKey = value => (value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
export const vehicleKey = value => (value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

export const matchingPartyLocations = (trip, party) => {
  const partyId = typeof party === 'object' ? party?.id : null;
  const name = typeof party === 'object' ? party?.to : party;
  return (trip.locations || []).filter(location =>
    partyId && location?.partyId
      ? location.partyId === partyId
      : partyKey(location?.to) === partyKey(name));
};

export const countPartyLocations = locations => (locations || []).reduce((counts, location) => {
  const name = location?.to?.trim();
  const id = location?.partyId || name;
  if (id && name) {
    const current = counts.get(id) || { name, count: 0 };
    counts.set(id, { ...current, count: current.count + 1 });
  }
  return counts;
}, new Map());

export const filterTripsByQuery = (trips, value) => {
  const query = value.trim().toLowerCase();
  if (!query) return trips;
  return trips.filter(trip => [
    trip.vehicleNo, trip.driverName, trip.date, trip.loadCount,
    ...(trip.locations || []).flatMap(location => [location.from, location.to]),
  ].some(field => String(field ?? '').toLowerCase().includes(query)));
};

export const countLocations = (locations, field) => (locations || []).reduce((counts, location) => {
  const name = location?.[field]?.trim();
  if (name) counts.set(name, (counts.get(name) || 0) + 1);
  return counts;
}, new Map());

export const locationCountChanges = (previous, next, field) => {
  const before = countLocations(previous?.locations, field);
  const after = countLocations(next?.locations, field);
  return [...new Set([...before.keys(), ...after.keys()])]
    .map(name => [name, (after.get(name) || 0) - (before.get(name) || 0)])
    .filter(([, delta]) => delta !== 0);
};

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export const safeSpreadsheetText = value => {
  const text = String(value ?? '');
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
};

export const parseTripDate = value => {
  if (!value || value === 'N/A') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) {
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return date.getFullYear() === Number(match[3]) &&
      date.getMonth() === Number(match[2]) - 1 &&
      date.getDate() === Number(match[1]) ? date : null;
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return parseTripDate(`${iso[3]}-${iso[2]}-${iso[1]}`);
  return null;
};

export const tripMonthKey = trip => {
  const date = parseTripDate(trip?.date) || parseTripDate(trip?.dateTimestamp);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null;
};

export const tripSortTime = trip =>
  (parseTripDate(trip.createdAt) || parseTripDate(trip.dateTimestamp) || parseTripDate(trip.date))?.getTime() || 0;
