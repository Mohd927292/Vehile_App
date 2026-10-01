import { escapeHtml, safeSpreadsheetText } from './tripData';
export const reportAmount = row =>
  row.amountIsShared
    ? 'Shared vehicle trip total'
    : row.amount == null || row.amount === ''
    ? '—'
    : String(row.amount);
export const reportRows = rows =>
  rows.flatMap(row =>
    (row.locations || [{ from: row.from, to: row.to }]).map(location => ({
      ...row,
      from: location.from || '',
      to: location.to || '',
      locations: [location],
    })),
  );
export const excelRows = rows =>
  reportRows(rows).map((row, index) => ({
    SL: index + 1,
    Date: row.date || '',
    Vehicle: safeSpreadsheetText(row.vehicleNo),
    Driver: safeSpreadsheetText(row.driverName),
    From: safeSpreadsheetText(row.from),
    To: safeSpreadsheetText(row.to),
    Amount: reportAmount(row),
    'Vehicle trip total (reference only)': row.amountIsShared
      ? row.tripAmount ?? ''
      : '',
  }));
export const reportHtml = (
  rows,
  title,
) => `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size:A4; margin:20pt 20pt 32pt; @bottom-right { content: "Page " counter(page) " / " counter(pages); font:9pt Arial; color:#666; } } *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:11pt}
h1{font-size:16pt;margin:0} .top{display:flex;justify-content:space-between;align-items:center;margin:0 0 12pt}
.card{border:.6pt solid #666;border-radius:2pt;margin-bottom:10pt;break-inside:avoid;page-break-inside:avoid}
.header{background:#ddd;padding:8pt 12pt;border-bottom:.3pt solid #666}.date{font-size:16pt;font-weight:bold}
.sl{display:inline-block;border:.3pt solid #666;background:white;padding:4pt;font-size:10pt;margin-right:10pt}
.amount{font-size:12pt;margin-top:4pt}.cell{padding:6pt 8pt}.label{color:#666;font-weight:bold;font-size:9pt;margin-bottom:2pt}
.value{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.35}.note{font-size:9pt;color:#666} .card.long{break-inside:auto;page-break-inside:auto}
</style></head><body><div class="top"><h1>${escapeHtml(
  title,
)}</h1><span>Total rows: ${reportRows(rows).length}</span></div>
${reportRows(rows)
  .map(
    (row, index) =>
      `<section class="card ${
        (row.from + row.to).length > 1800 ? 'long' : ''
      }"><div class="header"><div class="date"><span class="sl">SL ${
        index + 1
      }</span>${escapeHtml(row.date)}</div><div class="amount">Amount: ${
        row.amountIsShared
          ? 'Shared trip'
          : '₹ ' + escapeHtml(reportAmount(row))
      }</div></div>${[
        ['Driver', row.driverName],
        ['Vehicle', row.vehicleNo],
        ['From', row.from],
        ['To', row.to],
      ]
        .map(
          ([label, value]) =>
            `<div class="cell"><div class="label">${label}</div><div class="value">${escapeHtml(
              value,
            )}</div></div>`,
        )
        .join('')}</section>`,
  )
  .join('')}</body></html>`;
