import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Users, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your agency operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card data-testid="stat-card-clients">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-total-clients">{stats.totalClients}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.activeClients} active
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-md">
                <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-employees">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-total-employees">{stats.totalEmployees}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.activeEmployees} active
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-reports">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weekly Reports</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-submitted-reports">{stats.submittedReports}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.pendingReports} pending
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-md">
                <FileText className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-foreground">Active Clients</span>
                </div>
                <span className="text-sm font-bold text-foreground" data-testid="stat-active-clients">{stats.activeClients}</span>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-foreground">Active Employees</span>
                </div>
                <span className="text-sm font-bold text-foreground" data-testid="stat-active-employees">{stats.activeEmployees}</span>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-foreground">Pending Reports</span>
                </div>
                <span className="text-sm font-bold text-foreground" data-testid="stat-pending-reports">{stats.pendingReports}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start text-left h-auto py-3" data-testid="button-view-reports">
                <div>
                  <p className="text-sm font-medium text-foreground">View All Reports</p>
                  <p className="text-xs text-muted-foreground mt-1">Access client weekly reports</p>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-left h-auto py-3" data-testid="button-manage-assignments">
                <div>
                  <p className="text-sm font-medium text-foreground">Manage Assignments</p>
                  <p className="text-xs text-muted-foreground mt-1">Assign employees to clients</p>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-left h-auto py-3" data-testid="button-add-client">
                <div>
                  <p className="text-sm font-medium text-foreground">Add New Client</p>
                  <p className="text-xs text-muted-foreground mt-1">Onboard a new client</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
