import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment, EmployeeTask } from '../../lib/database.types';
import { Briefcase, FileText, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  service?: Service;
}

export function EnhancedEmployeeDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    reportsDueThisWeek: 0,
    tasksCompleted: 0,
    performance: 0,
  });

  useEffect(() => {
    if (user) {
      loadEmployeeData();
    }
  }, [user]);

  const loadEmployeeData = async () => {
    try {
      const [assignmentsRes, tasksRes, reportsRes] = await Promise.all([
        supabase.from('client_assignments').select('*').eq('employee_id', user!.id),
        supabase.from('employee_tasks').select('*').eq('employee_id', user!.id).order('due_date', { ascending: true }),
        supabase.from('weekly_reports').select('*').eq('employee_id', user!.id).gte('created_at', getThisMonthStart()),
      ]);

      if (assignmentsRes.data) {
        const assignmentsWithDetails = await Promise.all(
          assignmentsRes.data.map(async (assignment) => {
            const [clientRes, serviceRes] = await Promise.all([
              supabase.from('clients').select('*').eq('id', assignment.client_id).maybeSingle(),
              supabase.from('services').select('*').eq('id', assignment.service_id).maybeSingle(),
            ]);

            return {
              ...assignment,
              client: clientRes.data || undefined,
              service: serviceRes.data || undefined,
            };
          })
        );
        setAssignments(assignmentsWithDetails);

        const reports = reportsRes.data || [];
        const onTrackReports = reports.filter((r) => r.status === 'on_track').length;
        const performance = reports.length > 0 ? (onTrackReports / reports.length) * 100 : 0;

        setStats({
          totalClients: assignmentsWithDetails.length,
          reportsDueThisWeek: assignmentsWithDetails.length,
          tasksCompleted: tasksRes.data?.filter((t) => t.status === 'completed').length || 0,
          performance: Math.round(performance),
        });
      }

      if (tasksRes.data) {
        setTasks(tasksRes.data);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThisMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      await supabase.from('employee_tasks').update(updateData).eq('id', taskId);
      loadEmployeeData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isTaskOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const isTaskDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const soon = addDays(new Date(), 3);
    return isAfter(due, new Date()) && isBefore(due, soon);
  };

  const groupedByClient = assignments.reduce((acc, assignment) => {
    const clientId = assignment.client_id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: assignment.client,
        services: [],
      };
    }
    if (assignment.service) {
      acc[clientId].services.push(assignment.service);
    }
    return acc;
  }, {} as Record<string, { client?: Client; services: Service[] }>);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  if (loading) {
    return <div className="text-center py-12">Loading your dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reports Due</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.reportsDueThisWeek}</p>
              <p className="text-xs text-gray-500 mt-1">This week</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.tasksCompleted}</p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.performance}%</p>
              <p className="text-xs text-gray-500 mt-1">On-track rate</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Tasks</h2>

            {pendingTasks.length > 0 ? (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border-2 ${
                      isTaskOverdue(task.due_date)
                        ? 'bg-red-50 border-red-200'
                        : isTaskDueSoon(task.due_date)
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTaskPriorityColor(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                            {isTaskOverdue(task.due_date) && (
                              <span className="text-red-600 font-medium ml-1">Overdue!</span>
                            )}
                            {isTaskDueSoon(task.due_date) && (
                              <span className="text-yellow-600 font-medium ml-1">Due soon</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                          >
                            Start
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No pending tasks. Great job!</p>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
                  Completed
                </h3>
                <div className="space-y-2">
                  {completedTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 line-through">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Clients</h2>
            <div className="space-y-3">
              {Object.values(groupedByClient).map(({ client, services }) => {
                if (!client) return null;
                return (
                  <div key={client.id} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">{client.name}</h3>
                    <div className="flex flex-wrap gap-1">
                      {services.map((service) => (
                        <span
                          key={service.id}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(groupedByClient).length === 0 && (
                <p className="text-center text-gray-500 py-8">No clients assigned yet</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Submit Weekly Reports</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Don't forget to submit your weekly reports for all assigned clients.
                </p>
                <button
                  onClick={() => (window.location.hash = '#reports')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Go to Reports →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
