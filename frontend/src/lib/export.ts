import * as XLSX from 'xlsx';

export function exportToCSV<T>(rows: T[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = (row as any)[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel<T>(rows: T[], filename: string, sheetName = 'Sheet1') {
  if (!rows.length) return;
  const worksheet = XLSX.utils.json_to_sheet(rows as any[]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportTableToCSV<T>(columns: { key: string; header: string }[], data: T[], filename: string) {
  const mapped = data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col) => {
      const value = (row as any)[col.key];
      obj[col.header] = value ?? '';
    });
    return obj;
  });
  exportToCSV(mapped, filename);
}

export function exportTableToExcel<T>(columns: { key: string; header: string }[], data: T[], filename: string, sheetName = 'Sheet1') {
  const mapped = data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col) => {
      const value = (row as any)[col.key];
      obj[col.header] = value ?? '';
    });
    return obj;
  });
  exportToExcel(mapped, filename, sheetName);
}
