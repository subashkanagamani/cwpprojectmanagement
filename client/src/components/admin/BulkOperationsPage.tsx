import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Profile, ClientAssignment } from '../../lib/database.types';
import { Users, CheckSquare, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function BulkOperationsPage() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [operation, setOperation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, employeesRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('profiles').select('*').eq('role', 'employee').eq('status', 'active'),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    const newSelection = new Set(selectedClients);
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId);
    } else {
      newSelection.add(clientId);
    }
    setSelectedClients(newSelection);
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelection = new Set(selectedEmployees);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedEmployees(newSelection);
  };

  const selectAllClients = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients.map((c) => c.id)));
    }
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map((e) => e.id)));
    }
  };

  const handleBulkOperation = async () => {
    if (!operation) {
      showToast('Please select an operation', 'warning');
      return;
    }

    if (selectedClients.size === 0 && operation !== 'assign_employees') {
      showToast('Please select at least one client', 'warning');
      return;
    }

    setProcessing(true);

    try {
      switch (operation) {
        case 'archive_clients':
          await Promise.all(
            Array.from(selectedClients).map((clientId) =>
              supabase
                .from('clients')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', clientId)
            )
          );
          showToast(`${selectedClients.size} clients archived successfully`, 'success');
          break;

        case 'activate_clients':
          await Promise.all(
            Array.from(selectedClients).map((clientId) =>
              supabase
                .from('clients')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', clientId)
            )
          );
          showToast(`${selectedClients.size} clients activated successfully`, 'success');
          break;

        case 'pause_clients':
          await Promise.all(
            Array.from(selectedClients).map((clientId) =>
              supabase
                .from('clients')
                .update({ status: 'paused', updated_at: new Date().toISOString() })
                .eq('id', clientId)
            )
          );
          showToast(`${selectedClients.size} clients paused successfully`, 'success');
          break;

        case 'delete_clients':
          if (
            !confirm(
              `Are you sure you want to delete ${selectedClients.size} clients? This cannot be undone.`
            )
          ) {
            break;
          }
          await Promise.all(
            Array.from(selectedClients).map((clientId) =>
              supabase.from('clients').delete().eq('id', clientId)
            )
          );
          showToast(`${selectedClients.size} clients deleted successfully`, 'success');
          break;

        case 'deactivate_employees':
          await Promise.all(
            Array.from(selectedEmployees).map((employeeId) =>
              supabase
                .from('profiles')
                .update({ status: 'inactive', updated_at: new Date().toISOString() })
                .eq('id', employeeId)
            )
          );
          showToast(`${selectedEmployees.size} employees deactivated successfully`, 'success');
          break;

        default:
          showToast('Invalid operation', 'error');
      }

      setSelectedClients(new Set());
      setSelectedEmployees(new Set());
      loadData();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      showToast('Failed to complete bulk operation', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bulk Operations</h1>
          <p className="text-sm text-muted-foreground">Perform actions on multiple items at once</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={operation}
            onValueChange={(value) => setOperation(value)}
          >
            <SelectTrigger data-testid="select-operation">
              <SelectValue placeholder="Choose an operation..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Client Operations</SelectLabel>
                <SelectItem value="activate_clients">Activate Selected Clients</SelectItem>
                <SelectItem value="pause_clients">Pause Selected Clients</SelectItem>
                <SelectItem value="archive_clients">Archive Selected Clients</SelectItem>
                <SelectItem value="delete_clients">Delete Selected Clients</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Employee Operations</SelectLabel>
                <SelectItem value="deactivate_employees">Deactivate Selected Employees</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0">
            <CardTitle>Clients</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllClients}
              data-testid="button-select-all-clients"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {selectedClients.size === clients.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {clients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-3 p-3 hover-elevate rounded-md cursor-pointer"
                  data-testid={`checkbox-client-${client.id}`}
                >
                  <Checkbox
                    checked={selectedClients.has(client.id)}
                    onCheckedChange={() => toggleClientSelection(client.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.industry} &bull; {client.status}
                    </p>
                  </div>
                </label>
              ))}
              {clients.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No clients available</p>
              )}
            </div>
          </CardContent>
          <div className="p-4 border-t border-border bg-muted/50">
            <p className="text-sm text-muted-foreground" data-testid="text-clients-selected">
              {selectedClients.size} of {clients.length} selected
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0">
            <CardTitle>Employees</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllEmployees}
              data-testid="button-select-all-employees"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {selectedEmployees.size === employees.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {employees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center gap-3 p-3 hover-elevate rounded-md cursor-pointer"
                  data-testid={`checkbox-employee-${employee.id}`}
                >
                  <Checkbox
                    checked={selectedEmployees.has(employee.id)}
                    onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                  </div>
                </label>
              ))}
              {employees.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No employees available</p>
              )}
            </div>
          </CardContent>
          <div className="p-4 border-t border-border bg-muted/50">
            <p className="text-sm text-muted-foreground" data-testid="text-employees-selected">
              {selectedEmployees.size} of {employees.length} selected
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedClients(new Set());
            setSelectedEmployees(new Set());
            setOperation('');
          }}
          data-testid="button-clear-selection"
        >
          Clear Selection
        </Button>
        <Button
          onClick={handleBulkOperation}
          disabled={processing || !operation}
          data-testid="button-execute-operation"
        >
          {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {processing ? 'Processing...' : 'Execute Operation'}
        </Button>
      </div>

      {operation && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Warning:</span> This operation will affect{' '}
                {operation.includes('client') ? selectedClients.size : selectedEmployees.size} items.
                Please review your selection carefully.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
