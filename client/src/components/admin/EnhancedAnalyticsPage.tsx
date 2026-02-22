import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp, TrendingDown, Users, FileText, CheckCircle2, Activity,
  ArrowUp, ArrowDown, AlertTriangle, ChevronRight, BarChart3, Clock,
  Briefcase, UserCheck, Target, Heart
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#10B981',
  needs_attention: '#F59E0B',
  at_risk: '#EF4444',
};

const SERVICE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function EnhancedAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  const [clients, setClients] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [prevReports, setPrevReports] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(timeRange);
      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - daysAgo);

      const prevRangeStart = new Date();
      prevRangeStart.setDate(prevRangeStart.getDate() - daysAgo * 2);

      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const reportRangeStart = daysAgo > 56 ? rangeStart : eightWeeksAgo;

      const [
        clientsRes,
        reportsRes,
        prevReportsRes,
        assignmentsRes,
        employeesRes,
        servicesRes,
        tasksRes,
        employeeTasksRes,
        budgetsRes,
      ] = await Promise.all([
        supabase.from('clients').select('*').is('deleted_at', null),
        supabase.from('weekly_reports').select('id, employee_id, client_id, service_id, week_start_date, status, created_at, submitted_at')
          .gte('week_start_date', reportRangeStart.toISOString().split('T')[0]),
        supabase.from('weekly_reports').select('id, employee_id, client_id, service_id, status, created_at')
          .gte('created_at', prevRangeStart.toISOString())
          .lt('created_at', rangeStart.toISOString()),
        supabase.from('client_assignments').select('id, employee_id, client_id, service_id, is_active').eq('is_active', true),
        supabase.from('profiles').select('id, full_name, role, status, max_capacity, custom_fields').eq('role', 'employee').is('deleted_at', null),
        supabase.from('services').select('id, name, type'),
        supabase.from('tasks').select('id, status, assigned_to, due_date, completed_at, created_at')
          .gte('created_at', rangeStart.toISOString()),
        supabase.from('employee_tasks').select('id, status, assigned_to, priority, due_date, completed_at, created_at')
          .gte('created_at', rangeStart.toISOString()),
        supabase.from('client_budgets').select('client_id, service_id, monthly_budget, actual_spending'),
      ]);

      setClients(clientsRes.data || []);
      setReports(reportsRes.data || []);
      setPrevReports(prevReportsRes.data || []);
      setAssignments(assignmentsRes.data || []);
      setEmployees(employeesRes.data || []);
      setServices(servicesRes.data || []);
      setTasks(tasksRes.data || []);
      setEmployeeTasks(employeeTasksRes.data || []);
      setBudgets(budgetsRes.data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysAgo = parseInt(timeRange);
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - daysAgo);

  const currentReports = useMemo(() =>
    reports.filter(r => new Date(r.created_at) >= rangeStart),
    [reports, timeRange]
  );

  const kpis = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalClients = clients.length;

    const currentSubmitted = currentReports.filter(r => ['submitted', 'approved', 'on_track'].includes(r.status)).length;
    const currentTotal = currentReports.length;
    const submissionRate = currentTotal > 0 ? Math.round((currentSubmitted / currentTotal) * 100) : 0;

    const prevSubmitted = prevReports.filter(r => ['submitted', 'approved', 'on_track'].includes(r.status)).length;
    const prevTotal = prevReports.length;
    const prevSubmissionRate = prevTotal > 0 ? Math.round((prevSubmitted / prevTotal) * 100) : 0;

    const activeEmployees = employees.filter(e => e.status === 'active').length;

    const allTasks = [...tasks, ...employeeTasks];
    const completedTasks = allTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const taskCompletionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.monthly_budget || 0), 0);
    const totalSpending = budgets.reduce((sum, b) => sum + Number(b.actual_spending || 0), 0);

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      activeClients: { value: activeClients, total: totalClients, change: 0 },
      submissionRate: { value: submissionRate, change: calcChange(submissionRate, prevSubmissionRate) },
      teamSize: { value: activeEmployees, assignments: assignments.length },
      taskCompletion: { value: taskCompletionRate, completed: completedTasks, total: allTasks.length },
      totalBudget: { value: totalBudget, spent: totalSpending, utilization: totalBudget > 0 ? Math.round((totalSpending / totalBudget) * 100) : 0 },
      reportsCount: { current: currentTotal, previous: prevTotal, change: calcChange(currentTotal, prevTotal) },
    };
  }, [clients, currentReports, prevReports, employees, tasks, employeeTasks, assignments, budgets]);

  const weeklyTrend = useMemo(() => {
    const weekMap: Record<string, { submitted: number; draft: number; total: number }> = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const ws = getWeekStart(d);
      weekMap[ws] = { submitted: 0, draft: 0, total: 0 };
    }

    for (const r of reports) {
      const ws = r.week_start_date;
      if (weekMap[ws]) {
        weekMap[ws].total += 1;
        if (['submitted', 'approved', 'on_track'].includes(r.status)) {
          weekMap[ws].submitted += 1;
        } else {
          weekMap[ws].draft += 1;
        }
      }
    }

    return Object.entries(weekMap).map(([week, data]) => {
      const d = new Date(week + 'T00:00:00');
      return {
        week: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        submitted: data.submitted,
        draft: data.draft,
        total: data.total,
      };
    });
  }, [reports]);

  const clientHealthData = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active');
    const healthCounts: Record<string, number> = { healthy: 0, needs_attention: 0, at_risk: 0 };
    for (const c of activeClients) {
      const status = c.health_status || 'healthy';
      if (healthCounts[status] !== undefined) healthCounts[status]++;
      else healthCounts['healthy']++;
    }
    return Object.entries(healthCounts)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({
        name: name === 'healthy' ? 'Healthy' : name === 'needs_attention' ? 'Needs Attention' : 'At Risk',
        value,
        color: HEALTH_COLORS[name],
      }));
  }, [clients]);

  const serviceWorkload = useMemo(() => {
    const serviceMap: Record<string, { name: string; assignments: number; reports: number }> = {};
    const serviceNameMap: Record<string, string> = {};
    for (const s of services) {
      serviceNameMap[s.id] = s.name;
    }

    for (const a of assignments) {
      const sName = serviceNameMap[a.service_id] || 'Other';
      if (!serviceMap[sName]) serviceMap[sName] = { name: sName, assignments: 0, reports: 0 };
      serviceMap[sName].assignments += 1;
    }

    for (const r of currentReports) {
      const sName = serviceNameMap[r.service_id] || 'Other';
      if (!serviceMap[sName]) serviceMap[sName] = { name: sName, assignments: 0, reports: 0 };
      serviceMap[sName].reports += 1;
    }

    return Object.values(serviceMap).sort((a, b) => b.assignments - a.assignments);
  }, [assignments, currentReports, services]);

  const employeeUtilization = useMemo(() => {
    const empMap: Record<string, { name: string; assignments: number; capacity: number; reports: number }> = {};

    for (const emp of employees) {
      empMap[emp.id] = {
        name: emp.full_name?.split(' ')[0] || 'Unknown',
        assignments: 0,
        capacity: emp.max_capacity || 40,
        reports: 0,
      };
    }

    for (const a of assignments) {
      if (empMap[a.employee_id]) {
        empMap[a.employee_id].assignments += 1;
      }
    }

    for (const r of currentReports) {
      if (empMap[r.employee_id]) {
        empMap[r.employee_id].reports += 1;
      }
    }

    return Object.values(empMap)
      .filter(e => e.assignments > 0)
      .sort((a, b) => b.assignments - a.assignments)
      .slice(0, 10);
  }, [employees, assignments, currentReports]);

  const topPerformers = useMemo(() => {
    const empReports: Record<string, { name: string; total: number; submitted: number }> = {};

    for (const emp of employees) {
      empReports[emp.id] = { name: emp.full_name || 'Unknown', total: 0, submitted: 0 };
    }

    for (const r of currentReports) {
      if (!empReports[r.employee_id]) continue;
      empReports[r.employee_id].total += 1;
      if (['submitted', 'approved', 'on_track'].includes(r.status)) {
        empReports[r.employee_id].submitted += 1;
      }
    }

    return Object.values(empReports)
      .filter(e => e.total > 0)
      .map(e => ({
        ...e,
        rate: Math.round((e.submitted / e.total) * 100),
        score: e.submitted * 10 + e.total * 5,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [employees, currentReports]);

  const atRiskClients = useMemo(() => {
    return clients
      .filter(c => c.status === 'active' && (c.health_status === 'at_risk' || c.health_status === 'needs_attention'))
      .sort((a, b) => (a.health_score || 100) - (b.health_score || 100))
      .slice(0, 5);
  }, [clients]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-4" /><Skeleton className="h-9 w-20 mb-2" /><Skeleton className="h-3 w-32" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-[320px]" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[320px]" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start gap-4 flex-wrap animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance insights across your agency
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm font-medium text-muted-foreground">Active Clients</span>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{kpis.activeClients.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              out of {kpis.activeClients.total} total clients
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm font-medium text-muted-foreground">Report Submission Rate</span>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight text-foreground">{kpis.submissionRate.value}%</p>
              {kpis.submissionRate.change !== 0 && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  kpis.submissionRate.change >= 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                }`}>
                  {kpis.submissionRate.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(kpis.submissionRate.change)}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {kpis.reportsCount.current} reports this period
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm font-medium text-muted-foreground">Team Members</span>
              <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/30">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{kpis.teamSize.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {kpis.teamSize.assignments} active assignments
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card-gradient orange">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm font-medium text-muted-foreground">Task Completion</span>
              <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/30">
                <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{kpis.taskCompletion.value}%</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {kpis.taskCompletion.completed} of {kpis.taskCompletion.total} tasks done
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Report Submissions Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {weeklyTrend.some(w => w.total > 0) ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={weeklyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDraft" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorSubmitted)" dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="draft" name="Draft" stroke="#F59E0B" strokeWidth={2} fill="url(#colorDraft)" dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[320px]">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No report data for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Client Health</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {clientHealthData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={clientHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {clientHealthData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {clientHealthData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-xs font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[240px]">
                <Heart className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No client health data</p>
              </div>
            )}

            {kpis.totalBudget.value > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Budget Utilization</span>
                  <span className="text-sm font-semibold text-foreground">{kpis.totalBudget.utilization}%</span>
                </div>
                <Progress value={Math.min(kpis.totalBudget.utilization, 100)} className="h-2" />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">Spent: {formatCurrency(kpis.totalBudget.spent)}</span>
                  <span className="text-xs text-muted-foreground">Budget: {formatCurrency(kpis.totalBudget.value)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '300ms' }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Service Workload</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {serviceWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, serviceWorkload.length * 50)}>
                <BarChart data={serviceWorkload} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="assignments" name="Assignments" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="reports" name="Reports" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px]">
                <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No service data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Employee Workload</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {employeeUtilization.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, employeeUtilization.length * 44)}>
                <BarChart data={employeeUtilization} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="assignments" name="Assignments" fill="#10B981" radius={[0, 4, 4, 0]} barSize={14} />
                  <Bar dataKey="reports" name="Reports" fill="#06B6D4" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px]">
                <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No employee workload data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
              <Badge variant="secondary" className="text-xs">{topPerformers.length} employees</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                      i === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                      i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.total} reports, {p.submitted} submitted</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      p.rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      p.rate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>{p.rate}%</p>
                    <p className="text-xs text-muted-foreground">on-time</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10">
                  <UserCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No performance data for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Clients Needing Attention</CardTitle>
              {atRiskClients.length > 0 && (
                <Badge variant="destructive" className="text-xs">{atRiskClients.length} clients</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {atRiskClients.map((client, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      client.health_status === 'at_risk' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.industry || 'No industry'} &middot; Health score: {client.health_score ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={client.health_status === 'at_risk' ? 'destructive' : 'outline'} className="text-xs">
                      {client.health_status === 'at_risk' ? 'At Risk' : 'Needs Attention'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              {atRiskClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10">
                  <Target className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">All clients are in good health</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
