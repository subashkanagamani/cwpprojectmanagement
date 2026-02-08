import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
}

export const exportToExcel = (options: ExportOptions) => {
  const { filename, title, columns, data } = options;

  const headers = columns.map((col) => col.label);
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      return col.format ? col.format(value) : value || '';
    })
  );

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const columnWidths = columns.map((col) => {
    const maxLength = Math.max(
      col.label.length,
      ...rows.map((row, i) => String(row[columns.indexOf(col)]).length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title || 'Data');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (options: ExportOptions) => {
  const { filename, title, columns, data } = options;

  const doc = new jsPDF();

  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  const headers = columns.map((col) => col.label);
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      return col.format ? col.format(value) : value !== null && value !== undefined ? String(value) : '';
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 25 : 15,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: columns.reduce((acc, col, index) => {
      acc[index] = { cellWidth: 'auto' };
      return acc;
    }, {} as Record<number, any>),
  });

  doc.save(`${filename}.pdf`);
};

export const exportToCSV = (options: ExportOptions) => {
  const { filename, columns, data } = options;

  const headers = columns.map((col) => col.label).join(',');
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        const formatted = col.format ? col.format(value) : value || '';
        return `"${String(formatted).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

export const formatters = {
  date: (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString();
  },
  datetime: (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  },
  currency: (value: number | null) => {
    if (value === null || value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
  },
  percentage: (value: number | null) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  },
  boolean: (value: boolean) => {
    return value ? 'Yes' : 'No';
  },
  status: (value: string) => {
    return value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : '';
  },
};
