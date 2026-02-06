import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, Client, ClientAssignment, Service } from '../../lib/database.types';
import { Plus, Edit2, X, CheckCircle, XCircle, Users, Search, Briefcase } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface EmployeeWithDetails extends Profile {
  assignmentCount?: number;
  assignments?: Array<ClientAssignment & { client?: Client; service?: Service }>;
}

export function EmployeesPage() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee' as 'admin' | 'employee',
    status: 'active' as 'active' | 'inactive',
    phone: '',
    max_capacity: '5',
    skills: [] as string[],
  });
  const [assignFormData, setAssignFormData] = useState({
    client_id: '',
    service_id: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const [employeesRes, clientsRes, servicesRes, assignmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').eq('status', 'active'),
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('client_assignments').select('*, clients(*), services(*)'),
      ]);

      if (employeesRes.data) {
        const employeesWithDetails = employeesRes.data.map(employee => {
          const employeeAssignments = assignmentsRes.data?.filter(a => a.employee_id === employee.id) || [];
          return {
            ...employee,
            assignmentCount: employeeAssignments.length,
            assignments: employeeAssignments.map(a => ({
              ...a,
              client: a.clients,
              service: a.services,
            })),
          };
        });
        setEmployees(employeesWithDetails);
      }
      if (clientsRes.data) setClients(clientsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (employee?: Profile) => {
    if (employee) {
      setEditingEmployee(employee);
      const skillsArray = Array.isArray(employee.skills) ? employee.skills : [];
      setFormData({
        email: employee.email,
        password: '',
        full_name: employee.full_name,
        role: employee.role,
        status: employee.status,
        phone: employee.phone || '',
        max_capacity: employee.max_capacity?.toString() || '5',
        skills: skillsArray,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'employee',
        status: 'active',
        phone: '',
        max_capacity: '5',
        skills: [],
      });
    }
    setShowModal(true);
  };

  const openAssignModal = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setAssignFormData({ client_id: '', service_id: '' });
    setShowAssignModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('profiles')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            status: formData.status,
            phone: formData.phone || null,
            max_capacity: parseInt(formData.max_capacity),
            skills: formData.skills,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            status: formData.status,
            phone: formData.phone || null,
            max_capacity: parseInt(formData.max_capacity),
            skills: formData.skills,
          });

          if (profileError) throw profileError;
        }
      }

      setShowModal(false);
      loadEmployees();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      showToast(error.message || 'Failed to save employee', 'error');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const { data: clientServices } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', assignFormData.client_id)
        .eq('service_id', assignFormData.service_id)
        .maybeSingle();

      if (!clientServices) {
        showToast('This service is not enabled for this client. Please enable it first.', 'error');
        return;
      }

      const { error } = await supabase.from('client_assignments').insert({
        client_id: assignFormData.client_id,
        employee_id: selectedEmployee.id,
        service_id: assignFormData.service_id,
      });

      if (error) {
        if (error.code === '23505') {
          showToast('This employee is already assigned to this service for this client', 'error');
        } else {
          throw error;
        }
        return;
      }

      setShowAssignModal(false);
      loadEmployees();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create assignment', 'error');
    }
  };

  const toggleStatus = async (employee: Profile) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', employee.id);

      if (error) throw error;
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const getWorkloadColor = (count: number, capacity: number) => {
    const percentage = (count / capacity) * 100;
    if (percentage >= 100) return 'text-red-600 font-semibold';
    if (percentage >= 75) return 'text-orange-600 font-semibold';
    if (percentage >= 50) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  const getWorkloadLabel = (count: number, capacity: number) => {
    const percentage = (count / capacity) * 100;
    if (percentage >= 100) return 'At Capacity';
    if (percentage >= 75) return 'Heavy Load';
    if (percentage >= 50) return 'Moderate';
    return 'Light Load';
  };

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(employee.skills) && employee.skills.some((skill: string) =>
      skill.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  if (loading) {
    return <div className="text-center py-12">Loading employees...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage team members, skills, and assignments</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Add Employee
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees by name, email, or skills..."
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
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Workload
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assignments
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      <div className="text-xs text-gray-500">{employee.phone || 'No phone'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(employee.skills) && employee.skills.length > 0 ? (
                        employee.skills.slice(0, 2).map((skill: string, idx: number) => (
                          <span key={idx} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No skills</span>
                      )}
                      {Array.isArray(employee.skills) && employee.skills.length > 2 && (
                        <span className="text-xs text-gray-500">+{employee.skills.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.role === 'admin'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className={`text-sm ${getWorkloadColor(employee.assignmentCount || 0, employee.max_capacity)}`}>
                        {employee.assignmentCount || 0} / {employee.max_capacity}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getWorkloadLabel(employee.assignmentCount || 0, employee.max_capacity)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openAssignModal(employee)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>View ({employee.assignmentCount || 0})</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(employee)}
                      className="flex items-center gap-1"
                    >
                      {employee.status === 'active' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500 font-medium">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(employee)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No employees match your search.' : 'No employees yet. Add your first team member to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!!editingEmployee}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'admin' | 'employee',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'active' | 'inactive',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                  <div className="space-y-2">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(service.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              addSkill(service.name);
                            } else {
                              removeSkill(service.name);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {formData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  {editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Assignments for {selectedEmployee.full_name}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Current Assignments</h3>
                  <span className={`text-sm ${getWorkloadColor(selectedEmployee.assignmentCount || 0, selectedEmployee.max_capacity)}`}>
                    {selectedEmployee.assignmentCount || 0} / {selectedEmployee.max_capacity} capacity
                  </span>
                </div>
                {selectedEmployee.assignments && selectedEmployee.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{assignment.client?.name}</p>
                          <p className="text-xs text-gray-500">{assignment.service?.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No assignments yet.</p>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Assign New Client</h3>
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                    <select
                      value={assignFormData.client_id}
                      onChange={(e) => setAssignFormData({ ...assignFormData, client_id: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
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
                    <p className="text-xs text-gray-500 mt-1">Only services enabled for the client will be accepted</p>
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
                      disabled={(selectedEmployee.assignmentCount || 0) >= selectedEmployee.max_capacity}
                    >
                      Assign Client
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
