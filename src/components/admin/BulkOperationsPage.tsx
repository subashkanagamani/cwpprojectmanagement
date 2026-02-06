import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Profile, ClientAssignment } from '../../lib/database.types';
import { Users, CheckSquare, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

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
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bulk Operations</h1>
        <p className="text-gray-600 mt-1">Perform actions on multiple items at once</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Select Operation</h2>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose an operation...</option>
          <optgroup label="Client Operations">
            <option value="activate_clients">Activate Selected Clients</option>
            <option value="pause_clients">Pause Selected Clients</option>
            <option value="archive_clients">Archive Selected Clients</option>
            <option value="delete_clients">Delete Selected Clients</option>
          </optgroup>
          <optgroup label="Employee Operations">
            <option value="deactivate_employees">Deactivate Selected Employees</option>
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Clients</h3>
            <button
              onClick={selectAllClients}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <CheckSquare className="h-4 w-4" />
              {selectedClients.size === clients.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {clients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedClients.has(client.id)}
                    onChange={() => toggleClientSelection(client.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">
                      {client.industry} • {client.status}
                    </p>
                  </div>
                </label>
              ))}
              {clients.length === 0 && (
                <p className="text-center text-gray-500 py-8">No clients available</p>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {selectedClients.size} of {clients.length} selected
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Employees</h3>
            <button
              onClick={selectAllEmployees}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <CheckSquare className="h-4 w-4" />
              {selectedEmployees.size === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {employees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(employee.id)}
                    onChange={() => toggleEmployeeSelection(employee.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{employee.full_name}</p>
                    <p className="text-xs text-gray-500">{employee.email}</p>
                  </div>
                </label>
              ))}
              {employees.length === 0 && (
                <p className="text-center text-gray-500 py-8">No employees available</p>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {selectedEmployees.size} of {employees.length} selected
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setSelectedClients(new Set());
            setSelectedEmployees(new Set());
            setOperation('');
          }}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          Clear Selection
        </button>
        <button
          onClick={handleBulkOperation}
          disabled={processing || !operation}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition"
        >
          {processing ? 'Processing...' : 'Execute Operation'}
        </button>
      </div>

      {operation && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> This operation will affect{' '}
            {operation.includes('client') ? selectedClients.size : selectedEmployees.size} items.
            Please review your selection carefully.
          </p>
        </div>
      )}
    </div>
  );
}
