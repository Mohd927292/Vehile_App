import * as XLSX from 'xlsx';
import { writeWrappedWorkbook } from '../src/utils/spreadsheetWorkbook';
test('Excel export preserves explicit newlines, zero, and OOXML wrapping', () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ['From', 'Amount'],
      ['Gate 1\nUpper floor', 0],
    ]),
    'Trips',
  );
  const output = writeWrappedWorkbook(XLSX, book);
  const restored = XLSX.read(output, { type: 'base64', cellStyles: true });
  expect(restored.Sheets.Trips.A2.v).toBe('Gate 1\nUpper floor');
  expect(restored.Sheets.Trips.B2.v).toBe(0);
  expect(restored.Styles.CellXf[0].alignment.wrapText).toBe(true);
});
