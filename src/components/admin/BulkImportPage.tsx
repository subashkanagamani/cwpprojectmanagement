import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

type ImportType = 'clients' | 'employees' | 'time_entries' | 'goals';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export function BulkImportPage() {
  const { showToast } = useToast();
  const [importType, setImportType] = useState<ImportType>('clients');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const templates = {
    clients: {
      headers: ['name', 'industry', 'status', 'contact_name', 'contact_email', 'contact_phone', 'website', 'priority'],
      example: 'Acme Corp,Technology,active,John Doe,john@acme.com,555-1234,https://acme.com,high',
    },
    employees: {
      headers: ['email', 'full_name', 'role', 'status', 'max_capacity', 'phone'],
      example: 'jane@example.com,Jane Smith,employee,active,5,555-5678',
    },
    time_entries: {
      headers: ['employee_email', 'client_name', 'service_name', 'hours', 'date', 'description'],
      example: 'jane@example.com,Acme Corp,SEO,8,2024-01-15,Monthly SEO optimization',
    },
    goals: {
      headers: ['client_name', 'title', 'description', 'target_value', 'unit', 'start_date', 'target_date', 'priority'],
      example: 'Acme Corp,Increase Traffic,Grow organic traffic by 50%,50,percent,2024-01-01,2024-12-31,high',
    },
  };

  const downloadTemplate = () => {
    const template = templates[importType];
    const csvContent = [
      template.headers.join(','),
      template.example,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      return values;
    });
  };

  const importClients = async (rows: string[][]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const headers = rows[0];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row[0] === '') continue;

      try {
        const clientData: any = {};
        headers.forEach((header, index) => {
          clientData[header] = row[index] || null;
        });

        const { error } = await supabase.from('clients').insert(clientData);
        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: i + 1, error: error.message });
      }
    }

    return result;
  };

  const importEmployees = async (rows: string[][]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const headers = rows[0];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row[0] === '') continue;

      try {
        const { data: existingUser, error: signUpError } = await supabase.auth.signUp({
          email: row[headers.indexOf('email')],
          password: Math.random().toString(36).slice(-12),
        });

        if (signUpError) throw signUpError;

        const profileData: any = {
          id: existingUser.user?.id,
        };
        headers.forEach((header, index) => {
          if (header !== 'email') {
            profileData[header] = row[index] || null;
          } else {
            profileData['email'] = row[index];
          }
        });

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData);

        if (profileError) throw profileError;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: i + 1, error: error.message });
      }
    }

    return result;
  };

  const importTimeEntries = async (rows: string[][]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row[0] === '') continue;

      try {
        const [employeeEmail, clientName, serviceName, hours, date, description] = row;

        const { data: employee } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', employeeEmail)
          .single();

        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('name', clientName)
          .single();

        const { data: service } = await supabase
          .from('services')
          .select('id')
          .eq('name', serviceName)
          .single();

        if (!employee || !client || !service) {
          throw new Error('Employee, client, or service not found');
        }

        const { error } = await supabase.from('time_entries').insert({
          employee_id: employee.id,
          client_id: client.id,
          service_id: service.id,
          hours: parseFloat(hours),
          date,
          description: description || null,
        });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: i + 1, error: error.message });
      }
    }

    return result;
  };

  const importGoals = async (rows: string[][]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row[0] === '') continue;

      try {
        const [clientName, title, description, targetValue, unit, startDate, targetDate, priority] = row;

        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('name', clientName)
          .single();

        const { data: { user } } = await supabase.auth.getUser();

        if (!client || !user) {
          throw new Error('Client not found or user not authenticated');
        }

        const { error } = await supabase.from('goals').insert({
          client_id: client.id,
          title,
          description: description || null,
          target_value: parseFloat(targetValue),
          unit,
          start_date: startDate,
          target_date: targetDate,
          priority: priority || 'medium',
          created_by: user.id,
        });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: i + 1, error: error.message });
      }
    }

    return result;
  };

  const handleImport = async () => {
    if (!file) {
      showToast('Please select a file', 'error');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row');
      }

      let importResult: ImportResult;

      switch (importType) {
        case 'clients':
          importResult = await importClients(rows);
          break;
        case 'employees':
          importResult = await importEmployees(rows);
          break;
        case 'time_entries':
          importResult = await importTimeEntries(rows);
          break;
        case 'goals':
          importResult = await importGoals(rows);
          break;
        default:
          throw new Error('Invalid import type');
      }

      setResult(importResult);

      if (importResult.success > 0) {
        showToast(`Successfully imported ${importResult.success} records`, 'success');
      }

      if (importResult.failed > 0) {
        showToast(`Failed to import ${importResult.failed} records`, 'error');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showToast(error.message || 'Failed to import data', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Import</h1>
        <p className="text-gray-600 mt-1">Import multiple records from CSV files</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Download the template CSV file for the correct format</li>
              <li>Ensure all required fields are filled</li>
              <li>For employees, accounts will be created automatically</li>
              <li>For time entries and goals, referenced entities must exist</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Import Type <span className="text-red-500">*</span>
          </label>
          <select
            value={importType}
            onChange={(e) => setImportType(e.target.value as ImportType)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="clients">Clients</option>
            <option value="employees">Employees</option>
            <option value="time_entries">Time Entries</option>
            <option value="goals">Goals</option>
          </select>
        </div>

        <div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Download a template with the correct headers and example data
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {file ? (
                <p className="text-sm text-gray-700 font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700 font-medium">Click to upload CSV file</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                </>
              )}
            </label>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Upload className="h-5 w-5" />
          {importing ? 'Importing...' : 'Import Data'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Successfully Imported</p>
                <p className="text-sm text-green-700">{result.success} records</p>
              </div>
            </div>

            {result.failed > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <X className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Failed to Import</p>
                    <p className="text-sm text-red-700">{result.failed} records</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-sm font-medium text-red-900">Errors:</p>
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-800 bg-red-100 p-2 rounded">
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
