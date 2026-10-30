/**
 * Enterprise CSV Export Utility
 * Conforms to RFC 4180 standard for CSV data representation.
 */

export function exportToCSV(filename, headers, rows) {
  if (!rows || rows.length === 0) {
    console.warn('exportToCSV: No data rows available to export.');
    return;
  }

  // Format cell value: escape quotes and wrap in quotes if contains comma, quote, or newline
  const formatCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map((h) => formatCell(h.label)).join(',');
  const dataRows = rows.map((row) => {
    return headers.map((h) => {
      const val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.accessor];
      return formatCell(val);
    }).join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Excel compatibility

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
