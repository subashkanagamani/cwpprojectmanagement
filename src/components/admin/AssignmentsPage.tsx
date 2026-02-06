import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Profile, Service, ClientAssignment } from '../../lib/database.types';
import { Plus, X, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  employee?: Profile;
  service?: Service;
}

export function AssignmentsPage() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    employee_ids: [] as string[],
    service_id: '',
  });
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsRes, clientsRes, employeesRes, servicesRes] = await Promise.all([
        supabase.from('client_assignments').select(`
          *,
          clients(*),
          profiles(*),
          services(*)
        `),
        supabase.from('clients').select('*').eq('status', 'active'),
        supabase.from('profiles').select('*').eq('status', 'active').eq('role', 'employee'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);

      if (assignmentsRes.data) {
        const assignmentsWithDetails = assignmentsRes.data.map((assignment: any) => ({
          ...assignment,
          client: assignment.clients,
          employee: assignment.profiles,
          service: assignment.services,
        }));
        setAssignments(assignmentsWithDetails);
      }

      if (clientsRes.data) setClients(clientsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.employee_ids.length === 0) {
      showToast('Please select at least one employee', 'warning');
      return;
    }

    try {
      const { data: clientService } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', formData.client_id)
        .eq('service_id', formData.service_id)
        .maybeSingle();

      if (!clientService) {
        showToast('This service is not enabled for this client. Please enable it in the client settings first.', 'error');
        return;
      }

      const assignments = formData.employee_ids.map(employee_id => ({
        client_id: formData.client_id,
        employee_id: employee_id,
        service_id: formData.service_id,
      }));

      const { error } = await supabase.from('client_assignments').insert(assignments);

      if (error) {
        if (error.code === '23505') {
          showToast('One or more assignments already exist', 'error');
        } else {
          throw error;
        }
        return;
      }

      setShowModal(false);
      setFormData({ client_id: '', employee_ids: [], service_id: '' });
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create assignment', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const { error } = await supabase.from('client_assignments').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  let filteredAssignments = assignments;
  if (selectedClient !== 'all') {
    filteredAssignments = filteredAssignments.filter((a) => a.client_id === selectedClient);
  }
  if (selectedEmployee !== 'all') {
    filteredAssignments = filteredAssignments.filter((a) => a.employee_id === selectedEmployee);
  }

  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    const clientId = assignment.client_id;
    if (!acc[clientId]) {
      acc[clientId] = [];
    }
    acc[clientId].push(assignment);
    return acc;
  }, {} as Record<string, AssignmentWithDetails[]>);

  if (loading) {
    return <div className="text-center py-12">Loading assignments...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600 mt-1">Assign employees to clients with specific roles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          New Assignment
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Employee</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedAssignments).map(([clientId, clientAssignments]) => {
          const client = clientAssignments[0]?.client;
          if (!client) return null;

          return (
            <div key={clientId} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                <p className="text-sm text-gray-600">{client.industry}</p>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {clientAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {assignment.employee?.full_name}
                          </p>
                          <p className="text-sm text-gray-600">{assignment.employee?.email}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-300" />
                        <div>
                          <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {assignment.service?.name}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {Object.keys(groupedAssignments).length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              No assignments yet. Create your first assignment to get started.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Assignment</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Members ({formData.employee_ids.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <label
                        key={employee.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={formData.employee_ids.includes(employee.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                employee_ids: [...formData.employee_ids, employee.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                employee_ids: formData.employee_ids.filter(id => id !== employee.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          <div className="text-xs text-gray-500">{employee.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {formData.employee_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.employee_ids.map((employeeId) => {
                      const employee = employees.find(e => e.id === employeeId);
                      return (
                        <span
                          key={employeeId}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {employee?.full_name}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                employee_ids: formData.employee_ids.filter(id => id !== employeeId)
                              });
                            }}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service/Role
                </label>
                <select
                  value={formData.service_id}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
