import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
        const email = row[headers.indexOf('email')];

        if (!email || !email.includes('@')) {
          throw new Error('Invalid email address');
        }

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        let userId = existingProfile?.id;

        if (!existingProfile) {
          const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Date.now().toString(36)}`;

          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: tempPassword,
          });

          if (signUpError) {
            if (signUpError.message.includes('already registered')) {
              throw new Error(`User ${email} already exists in auth system`);
            }
            throw signUpError;
          }

          if (!authData.user) {
            throw new Error('Failed to create user account');
          }

          userId = authData.user.id;
        }

        const profileData: any = {
          id: userId,
        };

        headers.forEach((header, index) => {
          if (header !== 'email' && row[index]) {
            if (header === 'max_capacity') {
              profileData[header] = parseInt(row[index]) || 5;
            } else if (header === 'skills') {
              profileData[header] = row[index].split(',').map((s: string) => s.trim());
            } else {
              profileData[header] = row[index];
            }
          } else if (header === 'email') {
            profileData['email'] = email;
          }
        });

        if (!profileData.full_name) {
          throw new Error('Full name is required');
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) throw profileError;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: i + 1, error: error.message || 'Unknown error' });
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
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bulk Import</h1>
          <p className="text-sm text-muted-foreground">Import multiple records from CSV files</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1 text-foreground">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Download the template CSV file for the correct format</li>
                <li>Ensure all required fields are filled</li>
                <li>For employees, accounts will be created automatically</li>
                <li>For time entries and goals, referenced entities must exist</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="import-type">
              Import Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={importType}
              onValueChange={(value) => setImportType(value as ImportType)}
            >
              <SelectTrigger data-testid="select-import-type">
                <SelectValue placeholder="Select import type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Clients</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
                <SelectItem value="time_entries">Time Entries</SelectItem>
                <SelectItem value="goals">Goals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
            <p className="text-xs text-muted-foreground">
              Download a template with the correct headers and example data
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Select CSV File <span className="text-destructive">*</span>
            </Label>
            <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                {file ? (
                  <p className="text-sm text-foreground font-medium" data-testid="text-file-name">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-foreground font-medium">Click to upload CSV file</p>
                    <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full"
            data-testid="button-import-data"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {importing ? 'Importing...' : 'Import Data'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-md">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-foreground" data-testid="text-import-success">Successfully Imported</p>
                <p className="text-sm text-muted-foreground">{result.success} records</p>
              </div>
            </div>

            {result.failed > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-md">
                <div className="flex items-center gap-3 mb-3">
                  <X className="h-6 w-6 text-destructive" />
                  <div>
                    <p className="font-medium text-foreground" data-testid="text-import-failed">Failed to Import</p>
                    <p className="text-sm text-muted-foreground">{result.failed} records</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-sm font-medium text-foreground">Errors:</p>
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded-md" data-testid={`text-error-${index}`}>
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
