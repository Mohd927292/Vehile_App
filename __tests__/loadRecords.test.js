import { loadRecords, makeSearchTokens } from '../src/utils/loadRecords';
import { reportHtml, excelRows } from '../src/utils/tripReport';
const trip={date:'30-09-2026',dateTimestamp:new Date(2026,8,30),vehicleNo:'KA-01 AA 1234',driverName:'Driver',amount:200,locations:[{partyId:'a',from:'Warehouse\nGate 2',to:'Party A'},{partyId:'b',from:'Depot',to:'Party B'}]};
test('pairs are stored independently without losing newlines or duplicating a total',()=>{
 const rows=loadRecords('trip1',trip);expect(rows).toHaveLength(2);expect(rows[0].locations).toEqual([trip.locations[0]]);expect(rows[0].from).toBe('Warehouse\nGate 2');expect(rows[0].amount).toBeNull();expect(rows[0].tripAmount).toBe(200);expect(rows[0].amountIsShared).toBe(true);expect(rows[1].partyId).toBe('b');
 expect(makeSearchTokens(['KA01AA1234','Warehouse Gate'])).toContain('gate');
});
test('PDF and spreadsheet export retain one pair per row and escape hostile text',()=>{
 const rows=loadRecords('trip1',trip);const excel=excelRows(rows);expect(excel).toHaveLength(2);expect(excel[0].From).toBe('Warehouse\nGate 2');expect(excel[0].To).toBe('Party A');
 const html=reportHtml([{...rows[0],driverName:'<script>bad</script>'}],'Party A');expect(html).toContain('Warehouse\nGate 2');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('Party B');expect(html).toContain('white-space:pre-wrap');
});
test('single-pair amount remains exact including zero',()=>{expect(loadRecords('one',{...trip,amount:0,locations:[trip.locations[0]]})[0].amount).toBe(0);});
