import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Users, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalEmployees: number;
  activeEmployees: number;
  pendingReports: number;
  submittedReports: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    pendingReports: 0,
    submittedReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientsRes, employeesRes, reportsRes, assignmentsRes] = await Promise.all([
        supabase.from('clients').select('status'),
        supabase.from('profiles').select('status, role'),
        supabase.from('weekly_reports').select('id'),
        supabase.from('client_assignments').select('id'),
      ]);

      const clients = clientsRes.data || [];
      const employees = (employeesRes.data || []).filter((e) => e.role === 'employee');
      const reports = reportsRes.data || [];
      const assignments = assignmentsRes.data || [];

      const currentWeekStart = getWeekStart(new Date());
      const expectedReports = assignments.length;
      const submittedThisWeek = reports.length;

      setStats({
        totalClients: clients.length,
        activeClients: clients.filter((c) => c.status === 'active').length,
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.status === 'active').length,
        pendingReports: Math.max(0, expectedReports - submittedThisWeek),
        submittedReports: submittedThisWeek,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your agency operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.activeClients} active
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                {stats.activeEmployees} active
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                {stats.pendingReports} pending
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Active Clients</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.activeClients}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Active Employees</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.activeEmployees}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-900">Pending Reports</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.pendingReports}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="text-sm font-medium text-gray-900">View All Reports</p>
              <p className="text-xs text-gray-600 mt-1">Access client weekly reports</p>
            </button>
            <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="text-sm font-medium text-gray-900">Manage Assignments</p>
              <p className="text-xs text-gray-600 mt-1">Assign employees to clients</p>
            </button>
            <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="text-sm font-medium text-gray-900">Add New Client</p>
              <p className="text-xs text-gray-600 mt-1">Onboard a new client</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
