import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Users, FileText, CheckCircle, AlertCircle, Clock, TrendingUp, Plus, Eye, Settings } from 'lucide-react';
import { ActivityLog } from '../../lib/database.types';
import { format } from 'date-fns';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalEmployees: number;
  activeEmployees: number;
  pendingReports: number;
  submittedReports: number;
  clientsNeedingAttention: number;
  budgetUtilization: number;
}

interface QuickAction {
  label: string;
  icon: any;
  onClick: () => void;
  color: string;
}

export function EnhancedDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    pendingReports: 0,
    submittedReports: 0,
    clientsNeedingAttention: 0,
    budgetUtilization: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clientsRes, employeesRes, reportsRes, assignmentsRes, budgetsRes, logsRes] =
        await Promise.all([
          supabase.from('clients').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('status, role'),
          supabase.from('weekly_reports').select('*'),
          supabase.from('client_assignments').select('id'),
          supabase.from('client_budgets').select('*'),
          supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

      const clients = clientsRes.data || [];
      const employees = (employeesRes.data || []).filter((e) => e.role === 'employee');
      const reports = reportsRes.data || [];
      const budgets = budgetsRes.data || [];

      const currentWeekStart = getWeekStart(new Date());
      const reportsThisWeek = reports.filter(
        (r) => r.week_start_date === currentWeekStart
      ).length;
      const expectedReports = assignmentsRes.data?.length || 0;

      const totalBudget = budgets.reduce((sum, b) => sum + Number(b.monthly_budget), 0);
      const totalSpending = budgets.reduce((sum, b) => sum + Number(b.actual_spending), 0);
      const budgetUtil = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;

      const needsAttention = clients.filter(
        (c) => c.health_status === 'needs_attention' || c.health_status === 'at_risk'
      ).length;

      setStats({
        totalClients: clients.length,
        activeClients: clients.filter((c) => c.status === 'active').length,
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.status === 'active').length,
        pendingReports: Math.max(0, expectedReports - reportsThisWeek),
        submittedReports: reportsThisWeek,
        clientsNeedingAttention: needsAttention,
        budgetUtilization: budgetUtil,
      });

      setActivityLogs(logsRes.data || []);
      setRecentClients(clients.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const quickActions: QuickAction[] = [
    {
      label: 'View All Reports',
      icon: FileText,
      onClick: () => window.location.hash = '#reports',
      color: 'blue',
    },
    {
      label: 'Manage Assignments',
      icon: Users,
      onClick: () => window.location.hash = '#assignments',
      color: 'green',
    },
    {
      label: 'Add New Client',
      icon: Plus,
      onClick: () => window.location.hash = '#clients',
      color: 'purple',
    },
    {
      label: 'View Analytics',
      icon: TrendingUp,
      onClick: () => window.location.hash = '#analytics',
      color: 'orange',
    },
  ];

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      green: 'bg-green-100 text-green-600 hover:bg-green-200',
      purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
      orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const formatActivityLog = (log: ActivityLog) => {
    const action = log.action || 'action';
    const entity = log.entity_type || 'item';
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity}`;
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your agency operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.activeClients} active</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.activeEmployees} active</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Weekly Reports</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.submittedReports}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.pendingReports} pending</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Utilization</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.budgetUtilization.toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">of monthly budget</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {stats.clientsNeedingAttention > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Attention Required</h3>
              <p className="text-sm text-gray-700">
                {stats.clientsNeedingAttention} client(s) need attention. Review their health status
                and take action.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex items-center gap-3 p-4 rounded-xl transition ${getActionColor(
                  action.color
                )}`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                <div className="bg-blue-100 p-2 rounded-lg mt-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatActivityLog(log)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Clients</h3>
          <div className="space-y-4">
            {recentClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-600">{client.industry || 'No industry'}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    client.health_status === 'healthy'
                      ? 'bg-green-100 text-green-800'
                      : client.health_status === 'needs_attention'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {client.health_status}
                </span>
              </div>
            ))}
            {recentClients.length === 0 && (
              <p className="text-center text-gray-500 py-8">No clients yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
