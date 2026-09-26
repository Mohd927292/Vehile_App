import { matchingPartyLocations, parseTripDate, partyKey, vehicleKey, locationCountChanges, escapeHtml, safeSpreadsheetText, tripSortTime } from '../src/utils/tripData';

describe('trip identity and dates', () => {
  test('a party sees only its own locations from a shared trip', () => {
    const trip = { locations: [
      { from: 'Depot', to: '  Acme  Ltd ' },
      { from: 'Depot', to: 'Beta' },
      { from: 'North', to: 'ACME LTD' },
    ] };
    expect(matchingPartyLocations(trip, 'acme ltd')).toEqual([trip.locations[0], trip.locations[2]]);
    expect(partyKey(' Acme  Ltd ')).toBe(partyKey('ACME LTD'));
    expect(vehicleKey('mh-12 AB 1234')).toBe('MH12AB1234');
  });

  test('accepts stored day first and ISO dates and rejects impossible dates', () => {
    expect(parseTripDate('23-09-2026')?.getDate()).toBe(23);
    expect(parseTripDate('23/09/2026')?.getMonth()).toBe(8);
    expect(parseTripDate('2026-09-23')?.getFullYear()).toBe(2026);
    expect(parseTripDate('31-02-2026')).toBeNull();
  });

  test('sorts legacy trips that have no creation timestamp', () => {
    expect(tripSortTime({ date: '23-09-2026' })).toBeGreaterThan(tripSortTime({ date: '22-09-2026' }));
    expect(tripSortTime({})).toBe(0);
  });

  test('edits and deletes adjust repeated party locations exactly once', () => {
    const original = { locations: [{ to: 'Acme' }, { to: 'Acme' }, { to: 'Beta' }] };
    const edited = { locations: [{ to: 'Acme' }, { to: 'Gamma' }] };
    expect(locationCountChanges(original, edited, 'to')).toEqual([
      ['Acme', -1], ['Beta', -1], ['Gamma', 1],
    ]);
    expect(locationCountChanges(original, null, 'to')).toEqual([
      ['Acme', -2], ['Beta', -1],
    ]);
  });

  test('escapes business names in PDF HTML', () => {
    expect(escapeHtml('A & B <C>')).toBe('A &amp; B &lt;C&gt;');
  });

  test('keeps spreadsheet names from being interpreted as formulas', () => {
    expect(safeSpreadsheetText('=1+1')).toBe("'=1+1");
    expect(safeSpreadsheetText('  +SUM(A1)')).toBe("'  +SUM(A1)");
    expect(safeSpreadsheetText('ACME')).toBe('ACME');
  });
});
