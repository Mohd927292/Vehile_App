// SheetJS CE preserves values but does not emit cell alignment. Add the
// standard OOXML alignment to its generated style records so manual line
// breaks remain visible in Excel without changing any cell values.
export function writeWrappedWorkbook(XLSX, book) {
  const base64 = XLSX.write(book, { type: 'base64', bookType: 'xlsx' });
  const archive = XLSX.CFB.read(base64, { type: 'base64' });
  const index = archive.FullPaths.findIndex(path =>
    path.endsWith('/xl/styles.xml'),
  );
  if (index < 0) throw new Error('Spreadsheet styles are missing.');
  const entry = archive.FileIndex[index];
  const xml = Array.from(entry.content, code => String.fromCharCode(code)).join(
    '',
  );
  const updated = xml.replace(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/, section =>
    section.replace(
      /<xf\b([^>]*?)\/>/g,
      '<xf$1 applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
    ),
  );
  XLSX.CFB.utils.cfb_add(
    archive,
    archive.FullPaths[index],
    Uint8Array.from(updated, character => character.charCodeAt(0)),
  );
  return XLSX.CFB.write(archive, {
    type: 'base64',
    fileType: 'zip',
    compression: true,
  });
}
