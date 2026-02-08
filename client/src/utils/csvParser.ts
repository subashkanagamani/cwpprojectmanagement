interface CSVRow {
  [key: string]: string;
}

interface ParseResult<T> {
  success: boolean;
  data?: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

interface ClientImportData {
  name: string;
  company: string;
  email: string;
  phone?: string;
  status?: string;
  industry?: string;
}

interface EmployeeImportData {
  email: string;
  full_name: string;
  role?: string;
  department?: string;
}

export function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows: CSVRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length > 0) {
            const row: CSVRow = {};
            headers.forEach((header, index) => {
              row[header] = values[index]?.trim() || '';
            });
            rows.push(row);
          }
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

export function validateClientImport(rows: CSVRow[]): ParseResult<ClientImportData> {
  const errors: ParseResult<ClientImportData>['errors'] = [];
  const validData: ClientImportData[] = [];

  const requiredFields = ['name', 'company', 'email'];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    let hasErrors = false;

    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`
        });
        hasErrors = true;
      }
    });

    if (row.email && !isValidEmail(row.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format'
      });
      hasErrors = true;
    }

    if (!hasErrors) {
      validData.push({
        name: row.name,
        company: row.company,
        email: row.email.toLowerCase(),
        phone: row.phone || null,
        status: row.status || 'active',
        industry: row.industry || null
      });
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors
  };
}

export function validateEmployeeImport(rows: CSVRow[]): ParseResult<EmployeeImportData> {
  const errors: ParseResult<EmployeeImportData>['errors'] = [];
  const validData: EmployeeImportData[] = [];

  const requiredFields = ['email', 'full_name'];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    let hasErrors = false;

    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`
        });
        hasErrors = true;
      }
    });

    if (row.email && !isValidEmail(row.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format'
      });
      hasErrors = true;
    }

    if (row.role && !['admin', 'employee'].includes(row.role.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'role',
        message: 'Role must be either "admin" or "employee"'
      });
      hasErrors = true;
    }

    if (!hasErrors) {
      validData.push({
        email: row.email.toLowerCase(),
        full_name: row.full_name,
        role: row.role?.toLowerCase() as 'admin' | 'employee' || 'employee',
        department: row.department || null
      });
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateCSVTemplate(type: 'clients' | 'employees'): string {
  if (type === 'clients') {
    return 'name,company,email,phone,status,industry\nJohn Doe,Acme Corp,john@acme.com,555-0100,active,Technology\nJane Smith,TechStart Inc,jane@techstart.com,555-0200,active,Software';
  } else {
    return 'email,full_name,role,department\nemployee@company.com,John Doe,employee,Engineering\nadmin@company.com,Jane Smith,admin,Management';
  }
}

export function downloadCSVTemplate(type: 'clients' | 'employees') {
  const csv = generateCSVTemplate(type);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_import_template.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
