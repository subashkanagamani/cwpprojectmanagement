import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Service, Profile, ClientAssignment } from '../../lib/database.types';
import { Plus, Edit2, Trash2, X, Users, Search, DollarSign, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ClientWithDetails extends Client {
  assignmentCount?: number;
  assignments?: Array<ClientAssignment & { employee?: Profile; service?: Service }>;
  totalBudget?: number;
}

interface ClientsPageProps {
  onViewClient?: (clientId: string) => void;
}

export function ClientsPage({ onViewClient }: ClientsPageProps = {}) {
  const { showToast } = useToast();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    status: 'active' as 'active' | 'paused' | 'completed',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    health_status: 'healthy' as 'healthy' | 'needs_attention' | 'at_risk',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    selectedServices: [] as string[],
    selectedEmployees: [] as { employee_id: string, service_id: string }[],
  });
  const [assignFormData, setAssignFormData] = useState({
    employee_ids: [] as string[],
    service_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, servicesRes, employeesRes, assignmentsRes, budgetsRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('profiles').select('*').eq('role', 'employee').eq('status', 'active'),
        supabase.from('client_assignments').select('*, profiles(*), services(*)'),
        supabase.from('client_budgets').select('client_id, monthly_budget'),
      ]);

      if (clientsRes.data) {
        const clientsWithDetails = clientsRes.data.map(client => {
          const clientAssignments = assignmentsRes.data?.filter(a => a.client_id === client.id) || [];
          const clientBudgets = budgetsRes.data?.filter(b => b.client_id === client.id) || [];
          const totalBudget = clientBudgets.reduce((sum, b) => sum + Number(b.monthly_budget), 0);

          return {
            ...client,
            assignmentCount: clientAssignments.length,
            assignments: clientAssignments.map(a => ({
              ...a,
              employee: a.profiles,
              service: a.services,
            })),
            totalBudget,
          };
        });
        setClients(clientsWithDetails);
      }
      if (servicesRes.data) setServices(servicesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (client?: Client) => {
    if (client) {
      setEditingClient(client);
      const [{ data: clientServices }, { data: clientAssignments }] = await Promise.all([
        supabase.from('client_services').select('service_id').eq('client_id', client.id),
        supabase.from('client_assignments').select('employee_id, service_id').eq('client_id', client.id),
      ]);

      setFormData({
        name: client.name,
        industry: client.industry || '',
        status: client.status,
        priority: client.priority,
        health_status: client.health_status,
        start_date: client.start_date,
        notes: client.notes || '',
        contact_name: client.contact_name || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        website: client.website || '',
        selectedServices: clientServices?.map((cs) => cs.service_id) || [],
        selectedEmployees: clientAssignments || [],
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        industry: '',
        status: 'active',
        priority: 'medium',
        health_status: 'healthy',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        selectedServices: [],
        selectedEmployees: [],
      });
    }
    setShowModal(true);
  };

  const openAssignModal = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setAssignFormData({ employee_ids: [], service_id: '' });
    setShowAssignModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const incompleteAssignments = formData.selectedEmployees.filter(emp => !emp.service_id);
    if (incompleteAssignments.length > 0) {
      showToast('Please assign a role/service to all selected employees before saving', 'error');
      return;
    }

    try {
      const clientData = {
        name: formData.name,
        industry: formData.industry || null,
        status: formData.status,
        priority: formData.priority,
        health_status: formData.health_status,
        start_date: formData.start_date,
        notes: formData.notes || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website: formData.website || null,
        updated_at: new Date().toISOString(),
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;

        await Promise.all([
          supabase.from('client_services').delete().eq('client_id', editingClient.id),
          supabase.from('client_assignments').delete().eq('client_id', editingClient.id),
        ]);

        if (formData.selectedServices.length > 0) {
          const clientServices = formData.selectedServices.map((serviceId) => ({
            client_id: editingClient.id,
            service_id: serviceId,
          }));
          await supabase.from('client_services').insert(clientServices);
        }

        if (formData.selectedEmployees.length > 0) {
          const assignments = formData.selectedEmployees.map((emp) => ({
            client_id: editingClient.id,
            employee_id: emp.employee_id,
            service_id: emp.service_id,
          }));
          await supabase.from('client_assignments').insert(assignments);
        }
      } else {
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;

        if (newClient) {
          if (formData.selectedServices.length > 0) {
            const clientServices = formData.selectedServices.map((serviceId) => ({
              client_id: newClient.id,
              service_id: serviceId,
            }));
            await supabase.from('client_services').insert(clientServices);
          }

          if (formData.selectedEmployees.length > 0) {
            const assignments = formData.selectedEmployees.map((emp) => ({
              client_id: newClient.id,
              employee_id: emp.employee_id,
              service_id: emp.service_id,
            }));
            await supabase.from('client_assignments').insert(assignments);
          }
        }
      }

      setShowModal(false);
      showToast(editingClient ? 'Client updated successfully' : 'Client created successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Failed to save client', 'error');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    if (assignFormData.employee_ids.length === 0) {
      showToast('Please select at least one employee', 'error');
      return;
    }

    try {
      const { data: clientServices } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', selectedClient.id)
        .eq('service_id', assignFormData.service_id)
        .maybeSingle();

      if (!clientServices) {
        showToast('This service is not enabled for this client. Please enable it first.', 'error');
        return;
      }

      const assignments = assignFormData.employee_ids.map(employee_id => ({
        client_id: selectedClient.id,
        employee_id: employee_id,
        service_id: assignFormData.service_id,
      }));

      const { error } = await supabase.from('client_assignments').insert(assignments);

      if (error) {
        if (error.code === '23505') {
          showToast('One or more employees are already assigned to this service for this client', 'error');
        } else {
          throw error;
        }
        return;
      }

      setShowAssignModal(false);
      showToast('Team members assigned successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create assignment', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also remove all related assignments and data.')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'needs_attention': return 'text-yellow-600';
      case 'at_risk': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (client.contact_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading clients...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage your client accounts and team assignments</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Add Client
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients by name, industry, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Health
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.industry || 'No industry'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.contact_name ? (
                      <div>
                        <div className="text-sm text-gray-900">{client.contact_name}</div>
                        <div className="text-xs text-gray-500">{client.contact_email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No contact</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(client.priority)}`}>
                      {client.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <AlertCircle className={`h-4 w-4 ${getHealthColor(client.health_status)}`} />
                      <span className={`text-xs font-medium ${getHealthColor(client.health_status)}`}>
                        {client.health_status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openAssignModal(client)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Users className="h-4 w-4" />
                      <span>{client.assignmentCount || 0}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <DollarSign className="h-4 w-4" />
                      <span>{client.totalBudget?.toLocaleString() || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {onViewClient && (
                        <button
                          onClick={() => onViewClient(client.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openModal(client)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No clients match your search.' : 'No clients yet. Add your first client to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Health Status</label>
                  <select
                    value={formData.health_status}
                    onChange={(e) => setFormData({ ...formData, health_status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="healthy">Healthy</option>
                    <option value="needs_attention">Needs Attention</option>
                    <option value="at_risk">At Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Services Enabled
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedServices.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Team Members ({formData.selectedEmployees.length} assigned)
                </label>
                {formData.selectedServices.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    Please select at least one service above before assigning team members
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-3">Select employees and their roles for this client</p>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {employees.map((employee) => {
                        const assignedService = formData.selectedEmployees.find(
                          emp => emp.employee_id === employee.id
                        )?.service_id;

                        return (
                          <div
                            key={employee.id}
                            className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedEmployees.some(emp => emp.employee_id === employee.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedEmployees: [
                                      ...formData.selectedEmployees,
                                      { employee_id: employee.id, service_id: formData.selectedServices[0] }
                                    ]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedEmployees: formData.selectedEmployees.filter(
                                      emp => emp.employee_id !== employee.id
                                    )
                                  });
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                              <div className="text-xs text-gray-500">{employee.email}</div>
                            </div>
                            {formData.selectedEmployees.some(emp => emp.employee_id === employee.id) && (
                              <select
                                value={assignedService || ''}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    selectedEmployees: formData.selectedEmployees.map(emp =>
                                      emp.employee_id === employee.id
                                        ? { ...emp, service_id: e.target.value }
                                        : emp
                                    )
                                  });
                                }}
                                required
                                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select role</option>
                                {formData.selectedServices.map((serviceId) => {
                                  const service = services.find(s => s.id === serviceId);
                                  return (
                                    <option key={serviceId} value={serviceId}>
                                      {service?.name}
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  {editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Team for {selectedClient.name}
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Team Assignments</h3>
                {selectedClient.assignments && selectedClient.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClient.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{assignment.employee?.full_name}</p>
                          <p className="text-xs text-gray-500">{assignment.service?.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No team members assigned yet.</p>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Assign New Team Members</h3>
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Members ({assignFormData.employee_ids.length} selected)
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
                              checked={assignFormData.employee_ids.includes(employee.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignFormData({
                                    ...assignFormData,
                                    employee_ids: [...assignFormData.employee_ids, employee.id]
                                  });
                                } else {
                                  setAssignFormData({
                                    ...assignFormData,
                                    employee_ids: assignFormData.employee_ids.filter(id => id !== employee.id)
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
                    {assignFormData.employee_ids.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {assignFormData.employee_ids.map((employeeId) => {
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
                                  setAssignFormData({
                                    ...assignFormData,
                                    employee_ids: assignFormData.employee_ids.filter(id => id !== employeeId)
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service/Role</label>
                    <select
                      value={assignFormData.service_id}
                      onChange={(e) => setAssignFormData({ ...assignFormData, service_id: e.target.value })}
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
                    <p className="text-xs text-gray-500 mt-1">Only services enabled for this client can be assigned</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                    >
                      Assign Team Members
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
