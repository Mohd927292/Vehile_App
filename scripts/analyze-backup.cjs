const fs = require('fs');
const path = require('path');

const backup = process.argv[2];
if (!backup) throw new Error('Usage: node scripts/analyze-backup.cjs <backup-directory>');
const decode = value => {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  return null;
};
const read = name => JSON.parse(fs.readFileSync(path.join(backup, `${name}.json`), 'utf8'))
  .map(doc => ({ id: doc.name.split('/').pop(), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, decode(value)])) }));
const names = ['customers', 'drivers', 'fromcustomers', 'parties', 'tripEntries', 'vehicles'];
const data = Object.fromEntries(names.map(name => [name, read(name)]));
const partyKey = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const vehicleKey = value => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
const duplicates = (rows, field, normalize) => {
  const counts = new Map();
  for (const row of rows) {
    const key = normalize(row[field]);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.values()].filter(count => count > 1).length;
};
for (const name of names) {
  const fieldCounts = {};
  for (const row of data[name]) for (const field of Object.keys(row)) fieldCounts[field] = (fieldCounts[field] || 0) + 1;
  console.log(JSON.stringify({ collection: name, count: data[name].length, fields: fieldCounts }));
}
const trips = data.tripEntries;
const destinations = new Set(data.customers.map(customer => partyKey(customer.msName)));
const parties = new Set(data.parties.map(party => partyKey(party.to)));
const vehicles = new Set(data.vehicles.map(vehicle => vehicleKey(vehicle.vehicleNo)));
const allLocations = trips.flatMap(trip => trip.locations || []);
const tripDestinations = new Set(allLocations.map(location => partyKey(location?.to)).filter(Boolean));
const tripVehicles = new Set(trips.map(trip => vehicleKey(trip.vehicleNo)).filter(Boolean));
console.log(JSON.stringify({
  metrics: {
    tripsMissingVehicleKey: trips.filter(trip => !trip.vehicleKey).length,
    tripsMissingPartyKeys: trips.filter(trip => !Array.isArray(trip.partyKeys)).length,
    tripsMissingPartyIds: trips.filter(trip => !Array.isArray(trip.partyIds)).length,
    locationsMissingPartyId: allLocations.filter(location => !location?.partyId).length,
    tripsWithPartyIdMismatch: trips.filter(trip => {
      const ids = new Set((trip.locations || []).map(location => location.partyId).filter(Boolean));
      const stored = new Set(trip.partyIds || []);
      return ids.size !== stored.size || [...ids].some(id => !stored.has(id));
    }).length,
    tripsWithNoLocations: trips.filter(trip => !Array.isArray(trip.locations) || !trip.locations.length).length,
    locationsMissingDestination: allLocations.filter(location => !partyKey(location?.to)).length,
    distinctTripDestinations: tripDestinations.size,
    destinationsWithoutCustomer: [...tripDestinations].filter(name => !destinations.has(name)).length,
    destinationsWithoutPartySummary: [...tripDestinations].filter(name => !parties.has(name)).length,
    tripVehiclesWithoutSummary: [...tripVehicles].filter(name => !vehicles.has(name)).length,
    duplicateNormalizedCustomers: duplicates(data.customers, 'msName', partyKey),
    duplicateNormalizedPartySummaries: duplicates(data.parties, 'to', partyKey),
    duplicateNormalizedVehicleSummaries: duplicates(data.vehicles, 'vehicleNo', vehicleKey),
  },
}));
if (process.argv.includes('--details')) {
  const customerNames = new Map(data.customers.map(row => [partyKey(row.msName), row.msName]));
  const partyNames = new Map(data.parties.map(row => [partyKey(row.to), row.to]));
  const partyCounts = new Map();
  const vehicleCounts = new Map();
  for (const trip of trips) {
    const key = vehicleKey(trip.vehicleNo);
    vehicleCounts.set(key, (vehicleCounts.get(key) || 0) + 1);
    for (const location of trip.locations || []) {
      const destination = partyKey(location.to);
      partyCounts.set(destination, (partyCounts.get(destination) || 0) + 1);
    }
  }
  console.log(JSON.stringify({
    destinationsWithoutCustomer: [...tripDestinations].filter(name => !customerNames.has(name)),
    destinationsWithoutPartySummary: [...tripDestinations].filter(name => !partyNames.has(name)),
    partyCountMismatches: data.parties.filter(row => (row.loadCount || 0) !== (partyCounts.get(partyKey(row.to)) || 0)).map(row => ({ name: row.to, stored: row.loadCount, actual: partyCounts.get(partyKey(row.to)) || 0 })),
    vehicleCountMismatches: data.vehicles.filter(row => (row.loadCount || 0) !== (vehicleCounts.get(vehicleKey(row.vehicleNo)) || 0)).map(row => ({ name: row.vehicleNo, stored: row.loadCount, actual: vehicleCounts.get(vehicleKey(row.vehicleNo)) || 0 })),
  }));
}
