import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Clock,
  Calendar,
  Building2,
  Target,
  Activity,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface EmployeeWorkload {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  active_tasks_count: number;
  overdue_tasks_count: number;
  clients_assigned_count: number;
  completed_this_week_count: number;
  workload_score: number;
  workload_status: 'overloaded' | 'balanced' | 'underutilized';
  avg_task_priority: number;
}

interface WorkloadSummary {
  total_employees: number;
  overloaded_count: number;
  balanced_count: number;
  underutilized_count: number;
  avg_active_tasks: number;
  total_overdue_tasks: number;
  avg_clients_per_employee: number;
  avg_workload_score: number;
}

export function EmployeeWorkloadDashboard() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<EmployeeWorkload[]>([]);
  const [summary, setSummary] = useState<WorkloadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadWorkloadData();
  }, []);

  const loadWorkloadData = async () => {
    try {
      setLoading(true);

      const [{ data: employeesData, error: empError }, { data: summaryData, error: sumError }] =
        await Promise.all([
          supabase.rpc('get_employee_workload_metrics'),
          supabase.from('employee_workload_summary').select('*').single(),
        ]);

      if (empError) throw empError;
      if (sumError) throw sumError;

      setEmployees(employeesData || []);
      setSummary(summaryData);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overloaded':
        return {
          label: 'Overloaded',
          color: 'text-red-700',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
        };
      case 'balanced':
        return {
          label: 'Balanced',
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          icon: CheckCircle,
          iconColor: 'text-green-600',
        };
      case 'underutilized':
        return {
          label: 'Underutilized',
          color: 'text-blue-700',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-300',
          icon: TrendingDown,
          iconColor: 'text-blue-600',
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-700',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          icon: Activity,
          iconColor: 'text-gray-600',
        };
    }
  };

  const getWorkloadBarColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const filteredEmployees = employees.filter((emp) => {
    if (filterStatus === 'all') return true;
    return emp.workload_status === filterStatus;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading workload data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Workload Dashboard</h1>
          <p className="text-gray-600">Monitor team capacity and optimize task distribution</p>
        </div>
        <button
          onClick={loadWorkloadData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-200 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-700" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-900">{summary.overloaded_count}</div>
                <div className="text-sm text-red-700 font-medium">Overloaded</div>
              </div>
            </div>
            <div className="text-xs text-red-600">
              {summary.overloaded_count > 0 ? 'Needs immediate attention' : 'All good'}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-900">{summary.balanced_count}</div>
                <div className="text-sm text-green-700 font-medium">Balanced</div>
              </div>
            </div>
            <div className="text-xs text-green-600">Optimal workload</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-200 rounded-lg">
                <TrendingDown className="h-6 w-6 text-blue-700" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-900">{summary.underutilized_count}</div>
                <div className="text-sm text-blue-700 font-medium">Underutilized</div>
              </div>
            </div>
            <div className="text-xs text-blue-600">Can take more work</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-200 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-700" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-900">
                  {summary.avg_workload_score.toFixed(0)}
                </div>
                <div className="text-sm text-purple-700 font-medium">Avg Load Score</div>
              </div>
            </div>
            <div className="text-xs text-purple-600">Team average</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setFilterStatus('overloaded')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterStatus === 'overloaded'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Overloaded ({summary?.overloaded_count || 0})
            </button>
            <button
              onClick={() => setFilterStatus('balanced')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterStatus === 'balanced'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Balanced ({summary?.balanced_count || 0})
            </button>
            <button
              onClick={() => setFilterStatus('underutilized')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterStatus === 'underutilized'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Underutilized ({summary?.underutilized_count || 0})
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Workload Score
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Active Tasks
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Overdue
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Clients
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Done This Week
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Avg Priority
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No employees found with {filterStatus} status
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const statusConfig = getStatusConfig(employee.workload_status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={employee.employee_id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {employee.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {employee.employee_name}
                            </div>
                            <div className="text-xs text-gray-500">{employee.employee_email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig.bgColor} ${statusConfig.borderColor}`}
                          >
                            <StatusIcon className={`h-4 w-4 ${statusConfig.iconColor}`} />
                            <span className={`text-sm font-semibold ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-lg font-bold text-gray-900">
                            {employee.workload_score}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getWorkloadBarColor(
                                employee.workload_score
                              )}`}
                              style={{ width: `${Math.min(employee.workload_score, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold">
                          <Calendar className="h-4 w-4" />
                          {employee.active_tasks_count}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {employee.overdue_tasks_count > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-lg font-semibold">
                            <Clock className="h-4 w-4" />
                            {employee.overdue_tasks_count}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-semibold">
                          <Building2 className="h-4 w-4" />
                          {employee.clients_assigned_count}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-lg font-semibold">
                          <CheckCircle className="h-4 w-4" />
                          {employee.completed_this_week_count}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-gray-700">
                          {employee.avg_task_priority.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">out of 4.0</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Workload Classification Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-900">Overloaded</span>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>&gt;15 active tasks, OR</li>
              <li>&gt;5 overdue tasks, OR</li>
              <li>&gt;8 clients assigned</li>
            </ul>
            <div className="mt-2 text-xs text-red-700 font-medium">
              Action: Redistribute tasks or provide support
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-900">Balanced</span>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>6-15 active tasks, AND</li>
              <li>&lt;5 overdue tasks, AND</li>
              <li>3-8 clients assigned</li>
            </ul>
            <div className="mt-2 text-xs text-green-700 font-medium">
              Action: Maintain current workload
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Underutilized</span>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>&lt;6 active tasks, AND</li>
              <li>≤1 overdue task, AND</li>
              <li>&lt;3 clients assigned</li>
            </ul>
            <div className="mt-2 text-xs text-blue-700 font-medium">
              Action: Assign more work or projects
            </div>
          </div>
        </div>
      </div>

      {summary && summary.total_overdue_tasks > 0 && (
        <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900 mb-1">Action Required</h4>
              <p className="text-sm text-red-800">
                There are <strong>{summary.total_overdue_tasks} overdue tasks</strong> across the
                team. Consider prioritizing these or redistributing to available team members.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
