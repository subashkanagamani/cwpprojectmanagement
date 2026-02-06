import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, ClientAssignment, Profile, Service, WeeklyReport } from '../../lib/database.types';
import { ArrowLeft, Users, Plus, X, FileText, Calendar, DollarSign, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';

interface ClientDetailPageProps {
  clientId: string;
  onBack: () => void;
}

interface AssignmentWithDetails extends ClientAssignment {
  employee?: Profile;
  service?: Service;
}

interface ReportWithDetails extends WeeklyReport {
  employee?: Profile;
  service?: Service;
}

export function ClientDetailPage({ clientId, onBack }: ClientDetailPageProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    employee_id: '',
    service_id: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      const [clientRes, assignmentsRes, reportsRes, employeesRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
        supabase
          .from('client_assignments')
          .select('*, profiles(*), services(*)')
          .eq('client_id', clientId),
        supabase
          .from('weekly_reports')
          .select('*, profiles(*), services(*)')
          .eq('client_id', clientId)
          .order('week_start_date', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'employee')
          .eq('status', 'active'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);

      if (clientRes.data) setClient(clientRes.data);

      if (assignmentsRes.data) {
        setAssignments(
          assignmentsRes.data.map((a) => ({
            ...a,
            employee: a.profiles,
            service: a.services,
          }))
        );
      }

      if (reportsRes.data) {
        setReports(
          reportsRes.data.map((r) => ({
            ...r,
            employee: r.profiles,
            service: r.services,
          }))
        );
      }

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading client data:', error);
      showToast('Failed to load client data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignFormData.employee_id || !assignFormData.service_id) {
      showToast('Please select both employee and service', 'error');
      return;
    }

    const existingAssignment = assignments.find(
      (a) =>
        a.employee_id === assignFormData.employee_id &&
        a.service_id === assignFormData.service_id
    );

    if (existingAssignment) {
      showToast('This employee is already assigned to this service', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('client_assignments').insert({
        client_id: clientId,
        employee_id: assignFormData.employee_id,
        service_id: assignFormData.service_id,
      });

      if (error) throw error;

      showToast('Employee assigned successfully', 'success');
      setShowAssignModal(false);
      setAssignFormData({ employee_id: '', service_id: '' });
      loadClientData();
    } catch (error) {
      console.error('Error assigning employee:', error);
      showToast('Failed to assign employee', 'error');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const { error } = await supabase
        .from('client_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      showToast('Assignment removed successfully', 'success');
      loadClientData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      showToast('Failed to remove assignment', 'error');
    }
  };

  const getOnTrackCount = () => {
    return reports.filter((r) => r.status === 'on_track').length;
  };

  const getNeedsAttentionCount = () => {
    return reports.filter((r) => r.status === 'needs_attention').length;
  };

  if (loading) {
    return <div className="text-center py-12">Loading client details...</div>;
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Client not found</p>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Clients
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600 mt-1">{client.industry}</p>
          </div>
          <div
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              client.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {client.status === 'active' ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Client Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Team Size</p>
              <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">On Track</p>
              <p className="text-2xl font-bold text-gray-900">{getOnTrackCount()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Needs Attention</p>
              <p className="text-2xl font-bold text-gray-900">
                {getNeedsAttentionCount()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assigned Team</h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage employees assigned to this client
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="h-5 w-5" />
              Assign Employee
            </button>
          </div>
        </div>

        <div className="p-6">
          {assignments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No employees assigned yet. Click "Assign Employee" to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {assignment.employee?.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">{assignment.employee?.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-700 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-sm">
                    <span className="font-medium text-blue-900">
                      {assignment.service?.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Work Reports Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Work Reports</h2>
          <p className="text-gray-600 text-sm mt-1">View all submitted reports for this client</p>
        </div>

        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No reports submitted yet.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Work Summary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {format(new Date(report.week_start_date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.employee?.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.service?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          report.status === 'on_track'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'delayed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md truncate">
                        {report.work_summary || 'No summary provided'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assign Employee Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Assign Employee</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignEmployee} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    value={assignFormData.employee_id}
                    onChange={(e) =>
                      setAssignFormData({ ...assignFormData, employee_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select an employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <select
                    value={assignFormData.service_id}
                    onChange={(e) =>
                      setAssignFormData({ ...assignFormData, service_id: e.target.value })
                    }
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
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
