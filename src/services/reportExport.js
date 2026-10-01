import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { generatePDF } from 'react-native-html-to-pdf';
import { writeWrappedWorkbook } from '../utils/spreadsheetWorkbook';
import { excelRows, reportHtml } from '../utils/tripReport';

export async function exportTripReport(rows, title, format) {
  if (!rows.length) throw new Error('No matching entries to export.');
  const filename = `TripTrack_${title
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 60)}_${Date.now()}`;
  let filePath;
  if (format === 'pdf') {
    const result = await generatePDF({
      html: reportHtml(rows, title),
      fileName: filename,
      width: 595,
      height: 842,
      padding: 20,
    });
    filePath = result.filePath;
    if (!filePath) throw new Error('PDF generation did not return a file.');
    // Android sharing grants access only to the app cache, not external files.
    const sharedPath = `${RNFS.CachesDirectoryPath}/${filename}.pdf`;
    if (filePath.replace(/^file:\/\//, '') !== sharedPath) {
      await RNFS.copyFile(filePath, sharedPath);
      await RNFS.unlink(filePath).catch(() => {});
      filePath = sharedPath;
    }
  } else {
    const XLSX = require('xlsx');
    const data = excelRows(rows);
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet['!cols'] = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        12,
        key.length + 2,
        ...data.map(
          row =>
            Math.max(
              ...String(row[key])
                .split('\n')
                .map(line => line.length),
            ) + 2,
        ),
      ),
    }));
    sheet['!rows'] = [
      { hpt: 24 },
      ...data.map(row => ({
        hpt: Math.max(
          24,
          ...Object.values(row).map(
            value => String(value).split('\n').length * 15,
          ),
        ),
      })),
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Trip records');
    filePath = `${RNFS.CachesDirectoryPath}/${filename}.xlsx`;
    await RNFS.writeFile(filePath, writeWrappedWorkbook(XLSX, book), 'base64');
  }
  // Keep shared files long enough for the receiving app to read them.
  const files = await RNFS.readDir(RNFS.CachesDirectoryPath);
  await Promise.all(
    files
      .filter(
        file =>
          file.name.startsWith('TripTrack_') &&
          file.mtime &&
          Date.now() - new Date(file.mtime).getTime() > 7 * 86400000,
      )
      .map(file => RNFS.unlink(file.path).catch(() => {})),
  );
  await Share.open({
    title,
    url: `file://${filePath.replace(/^file:\/\//, '')}`,
    type:
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    failOnCancel: false,
  });
  return filePath;
}
