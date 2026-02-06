import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  CheckCircle,
  Clock,
  Users,
  Plus,
  TrendingUp,
  AlertCircle,
  User,
  Building2,
  RefreshCw,
  Target,
  ChevronRight
} from 'lucide-react';
import { Modal } from '../Modal';
import { LoadingButton } from '../LoadingButton';

interface TeamMemberTask {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  tasks_assigned_today: number;
  tasks_completed_today: number;
  pending_tasks_count: number;
  active_clients_count: number;
  avg_task_priority: number;
}

interface AvailableTeamMember {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  pending_tasks_count: number;
  workload_score: number;
  availability_status: 'available' | 'moderate' | 'busy';
}

interface Client {
  id: string;
  name: string;
}

export function AccountManagerDailyView() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberTask[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    client_id: '',
    priority: 'medium',
    due_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        { data: teamData, error: teamError },
        { data: availableData, error: availableError },
        { data: clientsData, error: clientsError },
      ] = await Promise.all([
        supabase.rpc('get_account_manager_daily_tasks'),
        supabase.rpc('get_available_team_members_for_assignment'),
        supabase
          .from('client_assignments')
          .select('client_id, clients(id, name)')
          .eq('employee_id', profile?.id || '')
          .then(({ data, error }) => {
            if (error) return { data: null, error };
            const uniqueClients = data
              ?.map((item: any) => item.clients)
              .filter((client: any, index: number, self: any[]) =>
                client && self.findIndex((c: any) => c?.id === client?.id) === index
              );
            return { data: uniqueClients, error: null };
          }),
      ]);

      if (teamError) throw teamError;
      if (availableError) throw availableError;
      if (clientsError) throw clientsError;

      setTeamMembers(teamData || []);
      setAvailableMembers(availableData || []);
      setClients(clientsData || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async () => {
    if (!taskForm.title || !taskForm.client_id || !selectedEmployee) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('tasks').insert({
        title: taskForm.title,
        description: taskForm.description,
        client_id: taskForm.client_id,
        assigned_to: selectedEmployee,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'pending',
      });

      if (error) throw error;

      showToast('Task assigned successfully', 'success');
      setShowAssignTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        client_id: '',
        priority: 'medium',
        due_date: '',
      });
      setSelectedEmployee('');
      loadDashboardData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailabilityConfig = (status: string) => {
    switch (status) {
      case 'available':
        return {
          label: 'Available',
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          icon: CheckCircle,
        };
      case 'moderate':
        return {
          label: 'Moderate',
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-300',
          icon: Clock,
        };
      case 'busy':
        return {
          label: 'Busy',
          color: 'text-red-700',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-700',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          icon: User,
        };
    }
  };

  const totalAssignedToday = teamMembers.reduce((sum, member) => sum + member.tasks_assigned_today, 0);
  const totalCompletedToday = teamMembers.reduce((sum, member) => sum + member.tasks_completed_today, 0);
  const totalPending = teamMembers.reduce((sum, member) => sum + member.pending_tasks_count, 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Manager Daily View</h1>
          <p className="text-gray-600">Track team progress and balance workload</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-200 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-700" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">{totalAssignedToday}</div>
              <div className="text-sm text-blue-700 font-medium">Assigned Today</div>
            </div>
          </div>
          <div className="text-xs text-blue-600">Tasks given to team members</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-900">{totalCompletedToday}</div>
              <div className="text-sm text-green-700 font-medium">Completed Today</div>
            </div>
          </div>
          <div className="text-xs text-green-600">Tasks finished by team</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-200 rounded-lg">
              <Clock className="h-6 w-6 text-orange-700" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-900">{totalPending}</div>
              <div className="text-sm text-orange-700 font-medium">Pending Tasks</div>
            </div>
          </div>
          <div className="text-xs text-orange-600">Active work items</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-200 rounded-lg">
              <Users className="h-6 w-6 text-purple-700" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-900">{teamMembers.length}</div>
              <div className="text-sm text-purple-700 font-medium">Team Members</div>
            </div>
          </div>
          <div className="text-xs text-purple-600">Under your management</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Team Performance Today
            </h2>
          </div>

          <div className="space-y-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No team members found</p>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.employee_id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {member.employee_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{member.employee_name}</div>
                        <div className="text-xs text-gray-500">{member.employee_email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEmployee(member.employee_id);
                        setShowAssignTaskModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      <Plus className="h-3 w-3" />
                      Assign Task
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {member.tasks_assigned_today}
                      </div>
                      <div className="text-xs text-gray-500">Assigned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {member.tasks_completed_today}
                      </div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {member.pending_tasks_count}
                      </div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {member.active_clients_count}
                      </div>
                      <div className="text-xs text-gray-500">Clients</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Available for Task Assignment
            </h2>
          </div>

          <div className="space-y-3">
            {availableMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No team members available</p>
              </div>
            ) : (
              availableMembers.slice(0, 10).map((member) => {
                const config = getAvailabilityConfig(member.availability_status);
                const StatusIcon = config.icon;

                return (
                  <div
                    key={member.employee_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xs">
                        {member.employee_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {member.employee_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.pending_tasks_count} pending tasks
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedEmployee(member.employee_id);
                          setShowAssignTaskModal(true);
                        }}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Available (&lt;6 tasks)
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                Moderate (6-15 tasks)
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                Busy (&gt;15 tasks)
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAssignTaskModal}
        onClose={() => {
          setShowAssignTaskModal(false);
          setSelectedEmployee('');
          setTaskForm({
            title: '',
            description: '',
            client_id: '',
            priority: 'medium',
            due_date: '',
          });
        }}
        title="Assign New Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select team member...</option>
              {availableMembers.map((member) => (
                <option key={member.employee_id} value={member.employee_id}>
                  {member.employee_name} ({member.pending_tasks_count} pending tasks)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={taskForm.client_id}
              onChange={(e) => setTaskForm({ ...taskForm, client_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <LoadingButton
              onClick={handleAssignTask}
              loading={submitting}
              className="flex-1 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Assign Task
            </LoadingButton>
            <button
              onClick={() => {
                setShowAssignTaskModal(false);
                setSelectedEmployee('');
                setTaskForm({
                  title: '',
                  description: '',
                  client_id: '',
                  priority: 'medium',
                  due_date: '',
                });
              }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
