export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'doc';

const HEADERS = [
  'Product Title', 'Category', 'Marketplace',
  'Score', 'Recommendation', 'Confidence',
  'Demand', 'Competition', 'Margin', 'Trend', 'Shipping', 'Mkt Fit', 'Saturation',
  'Sourcing Cost', 'Sale Price', 'Net Profit', 'Net Margin %', 'ROI %',
  'Top Supplier', 'Supplier Source',
  'Scanned On',
];

function fmt(minor: number | null | undefined): string {
  if (minor == null) return '—';
  return `$${(minor / 100).toFixed(2)}`;
}

function pct(val: number | null | undefined): string {
  if (val == null) return '—';
  return `${Number(val).toFixed(1)}%`;
}

function toRows(opportunities: any[]): string[][] {
  return opportunities.map(opp => {
    const pm  = opp.profitModel ?? {};
    const sc  = opp.score ?? {};
    const sup = opp.sourcingCandidates?.[0] ?? {};
    const ts  = opp.createdAt
      ? new Date(Number(opp.createdAt)).toLocaleDateString('en-IN', { dateStyle: 'medium' })
      : '';
    return [
      opp.product?.title          ?? '',
      opp.product?.category       ?? '',
      opp.marketplace?.code?.toUpperCase() ?? '',
      String(sc.opportunityScore  ?? ''),
      (sc.recommendation          ?? '').toUpperCase(),
      sc.confidence != null       ? `${sc.confidence}%` : '—',
      String(sc.demand            ?? ''),
      String(sc.competition       ?? ''),
      String(sc.margin            ?? ''),
      String(sc.trend             ?? ''),
      String(sc.shipping          ?? ''),
      String(sc.marketplaceFit    ?? ''),
      String(sc.saturation        ?? ''),
      fmt(pm.productCostMinor),
      fmt(pm.salePriceMinor),
      fmt(pm.netProfitMinor ?? pm.trueNetMinor),
      pct(pm.netMarginPct),
      pct(pm.roiPct),
      sup.supplierName ?? '—',
      sup.source       ?? '—',
      ts,
    ];
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
}

function baseFilename(label: string, ext: string) {
  const d = new Date().toISOString().slice(0, 10);
  return `sellbodr-${label.replace(/\s+/g, '-').toLowerCase()}-${d}.${ext}`;
}

export async function exportCSV(opportunities: any[], label = 'opportunities') {
  const rows = [HEADERS, ...toRows(opportunities)];
  const csv  = rows
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  downloadBlob(
    new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }),
    baseFilename(label, 'csv'),
  );
}

export async function exportXLSX(opportunities: any[], label = 'opportunities') {
  const XLSX = await import('xlsx');
  const rows = [HEADERS, ...toRows(opportunities)];
  const ws   = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = HEADERS.map((h, i) => {
    const maxLen = Math.max(h.length, ...toRows(opportunities).map(r => String(r[i] ?? '').length));
    return { wch: Math.min(maxLen + 2, 38) };
  });

  // Bold header row style (xlsx lite styling)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: '7C3AED' } } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Opportunities');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    baseFilename(label, 'xlsx'),
  );
}

export async function exportPDF(opportunities: any[], label = 'opportunities') {
  const rows    = toRows(opportunities);
  const date    = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  const thHtml  = HEADERS.map(h => `<th>${h}</th>`).join('');
  const tbHtml  = rows.map(row =>
    `<tr>${row.map((cell, i) => {
      let style = '';
      if (i === 3) {
        const n = Number(cell);
        style = `color:${n >= 70 ? '#10B981' : n >= 50 ? '#f59e0b' : '#ef4444'};font-weight:700`;
      }
      if (i === 4) {
        const c = cell === 'LAUNCH' ? '#10B981' : cell === 'HOLD' ? '#f59e0b' : '#ef4444';
        style = `color:${c};font-weight:700`;
      }
      return `<td style="${style}">${cell || '—'}</td>`;
    }).join('')}</tr>`,
  ).join('');

  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>SellBodr · ${label}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:9px;color:#1e293b;padding:20px}
  header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:2px solid #7c3aed;padding-bottom:8px}
  h1{font-size:16px;font-weight:900;color:#7c3aed}
  .meta{font-size:8px;color:#64748b;margin-top:2px}
  .badge{background:#7c3aed;color:#fff;font-size:7px;font-weight:700;padding:2px 6px;border-radius:20px}
  table{width:100%;border-collapse:collapse;margin-top:0;font-size:7.5px}
  th{background:#7c3aed;color:#fff;padding:4px 5px;text-align:left;font-weight:700;white-space:nowrap}
  td{padding:3px 5px;border-bottom:1px solid #e2e8f0;vertical-align:top;max-width:100px;word-break:break-word}
  tr:nth-child(even) td{background:#f8fafc}
  footer{margin-top:10px;font-size:7px;color:#94a3b8;text-align:center}
  @page{size:A3 landscape;margin:12mm}
  @media print{body{padding:0}button{display:none}}
</style>
</head><body>
<header>
  <div>
    <h1>SellBodr — Opportunity Report</h1>
    <div class="meta">Generated: ${date} · ${opportunities.length} opportunities · sellbodr.vercel.app</div>
  </div>
  <div class="badge">PRO EXPORT</div>
</header>
<table>
  <thead><tr>${thHtml}</tr></thead>
  <tbody>${tbHtml}</tbody>
</table>
<footer>© SellBodr / Digiaim Group · AI-powered cross-border eCommerce intelligence · Data is AI-generated and for informational purposes only</footer>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Allow pop-ups to generate PDF'); return; }
  win.document.write(html);
  win.document.close();
}

export async function exportDOC(opportunities: any[], label = 'opportunities') {
  const rows = toRows(opportunities);
  const date = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  const thHtml = HEADERS.map(h => `<th>${h}</th>`).join('');
  const tbHtml = rows.map(row =>
    `<tr>${row.map(cell => `<td>${cell || '—'}</td>`).join('')}</tr>`,
  ).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>SellBodr Opportunities</title>
  <!--[if gte mso 9]><xml>
    <w:WordDocument><w:View>Print</w:View><w:Zoom>75</w:Zoom>
    <w:DoNotOptimizeForBrowser/></w:WordDocument>
  </xml><![endif]-->
  <style>
    body{font-family:Calibri,Arial,sans-serif;font-size:8pt;color:#1e293b;margin:1cm}
    h1{font-size:14pt;color:#7c3aed;font-weight:bold;margin-bottom:2pt}
    .meta{font-size:7pt;color:#64748b;margin-bottom:10pt}
    table{border-collapse:collapse;width:100%;font-size:6.5pt}
    th{background:#7c3aed;color:#fff;padding:3pt 5pt;font-weight:bold;border:0.5pt solid #6d28d9;white-space:nowrap}
    td{padding:2.5pt 5pt;border:0.5pt solid #e2e8f0;vertical-align:top}
    tr:nth-child(even) td{background:#f8fafc}
    .footer{margin-top:8pt;font-size:6pt;color:#94a3b8}
  </style>
</head>
<body>
  <h1>SellBodr — Opportunity Report</h1>
  <div class="meta">Generated: ${date} · ${opportunities.length} opportunities · sellbodr.vercel.app</div>
  <table>
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${tbHtml}</tbody>
  </table>
  <div class="footer">© SellBodr / Digiaim Group · AI-generated data is for informational purposes only</div>
</body>
</html>`;

  downloadBlob(
    new Blob([html], { type: 'application/msword' }),
    baseFilename(label, 'doc'),
  );
}

export async function exportData(format: ExportFormat, opportunities: any[], label = 'opportunities') {
  if (!opportunities.length) return;
  switch (format) {
    case 'csv':  return exportCSV(opportunities, label);
    case 'xlsx': return exportXLSX(opportunities, label);
    case 'pdf':  return exportPDF(opportunities, label);
    case 'doc':  return exportDOC(opportunities, label);
  }
}
