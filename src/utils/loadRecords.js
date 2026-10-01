// Each From/To pair is an independent read model linked to its vehicle trip.
export const searchKey = value =>
  String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
export const makeSearchTokens = values => {
  const tokens = new Set();
  for (const value of values) {
    const normalized = searchKey(value);
    for (const word of new Set([normalized, ...normalized.split(' ')])) {
      for (let end = 1; end <= Math.min(word.length, 48); end++)
        tokens.add(word.slice(0, end));
    }
  }
  return [...tokens];
};
export const loadRecords = (tripId, trip) =>
  (trip.locations || []).map((location, index) => {
    const amountIsShared =
      trip.amountScope !== 'pair' && trip.locations.length > 1;
    return {
      id: `${tripId}__${index}`,
      tripId,
      pairIndex: index,
      schemaVersion: 2,
      date: trip.date,
      dateTimestamp: trip.dateTimestamp,
      vehicleNo: trip.vehicleNo,
      vehicleKey: String(trip.vehicleNo || '')
        .replace(/[^a-z0-9]/gi, '')
        .toUpperCase(),
      driverName: trip.driverName || '',
      from: location.from || '',
      to: location.to || '',
      partyId: location.partyId,
      locations: [location],
      loadCount: 1,
      amount: amountIsShared ? null : trip.amount ?? null,
      amountIsShared,
      tripAmount: trip.amount ?? null,
      createdAt: trip.createdAt || trip.dateTimestamp,
      ...(trip.createdBy ? { createdBy: trip.createdBy } : {}),
      searchTokens: makeSearchTokens([
        trip.vehicleNo,
        String(trip.vehicleNo || '').replace(/[^a-z0-9]/gi, ''),
        trip.driverName,
        location.from,
        location.to,
        trip.date,
      ]),
    };
  });
