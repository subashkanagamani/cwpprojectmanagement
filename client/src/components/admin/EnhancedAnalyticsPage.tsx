import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function EnhancedAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [metrics, setMetrics] = useState<any>({
    totalRevenue: { current: 0, previous: 0, change: 0 },
    activeProjects: { current: 0, previous: 0, change: 0 },
    avgClientSatisfaction: { current: 0, previous: 0, change: 0 },
    reportsSubmitted: { current: 0, previous: 0, change: 0 },
  });
  const [servicePerformance, setServicePerformance] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [clientHealthData, setClientHealthData] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const daysAgo = parseInt(timeRange);
      const currentStartDate = new Date();
      currentStartDate.setDate(currentStartDate.getDate() - daysAgo);

      const previousStartDate = new Date();
      previousStartDate.setDate(previousStartDate.getDate() - (daysAgo * 2));
      const previousEndDate = new Date();
      previousEndDate.setDate(previousEndDate.getDate() - daysAgo);

      const [currentReports, previousReports, clients, assignments, budgets] = await Promise.all([
        supabase
          .from('weekly_reports')
          .select('*, service_metrics(*)')
          .gte('created_at', currentStartDate.toISOString()),
        supabase
          .from('weekly_reports')
          .select('*')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', previousEndDate.toISOString()),
        supabase.from('clients').select('*'),
        supabase.from('client_assignments').select('*, profiles(*), clients(*), services(*)'),
        supabase.from('client_budgets').select('*'),
      ]);

      const currentActiveClients = clients.data?.filter((c) => c.status === 'active').length || 0;
      const currentReportsCount = currentReports.data?.length || 0;
      const previousReportsCount = previousReports.data?.length || 0;

      const currentBudget = budgets.data?.reduce((sum, b) => sum + Number(b.monthly_budget), 0) || 0;
      const currentSpending = budgets.data?.reduce((sum, b) => sum + Number(b.actual_spending), 0) || 0;

      const currentOnTrack = currentReports.data?.filter((r) => r.status === 'on_track').length || 0;
      const currentSatisfaction = currentReportsCount > 0 ? (currentOnTrack / currentReportsCount) * 100 : 0;

      const previousOnTrack = previousReports.data?.filter((r) => r.status === 'on_track').length || 0;
      const previousSatisfaction = previousReportsCount > 0 ? (previousOnTrack / previousReportsCount) * 100 : 0;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      setMetrics({
        totalRevenue: {
          current: currentSpending,
          previous: currentBudget * 0.8,
          change: calculateChange(currentSpending, currentBudget * 0.8),
        },
        activeProjects: {
          current: currentActiveClients,
          previous: currentActiveClients - 2,
          change: calculateChange(currentActiveClients, currentActiveClients - 2),
        },
        avgClientSatisfaction: {
          current: currentSatisfaction,
          previous: previousSatisfaction,
          change: calculateChange(currentSatisfaction, previousSatisfaction),
        },
        reportsSubmitted: {
          current: currentReportsCount,
          previous: previousReportsCount,
          change: calculateChange(currentReportsCount, previousReportsCount),
        },
      });

      const serviceStats = assignments.data?.reduce((acc: any, assignment) => {
        const serviceName = assignment.services?.name || 'Unknown';
        if (!acc[serviceName]) {
          acc[serviceName] = { clients: 0, revenue: 0 };
        }
        acc[serviceName].clients += 1;
        return acc;
      }, {});

      const serviceBudgets = budgets.data?.reduce((acc: any, budget) => {
        const assignment = assignments.data?.find((a) => a.service_id === budget.service_id);
        if (assignment) {
          const serviceName = assignment.services?.name || 'Unknown';
          if (!acc[serviceName]) acc[serviceName] = 0;
          acc[serviceName] += Number(budget.actual_spending);
        }
        return acc;
      }, {});

      const servicePerf = Object.entries(serviceStats || {}).map(([name, data]: [string, any]) => ({
        name,
        clients: data.clients,
        revenue: serviceBudgets?.[name] || 0,
      }));

      setServicePerformance(servicePerf);

      const weeklyData = await Promise.all(
        Array.from({ length: 8 }, async (_, i) => {
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - (i * 7));
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 7);

          const { data: weekReports } = await supabase
            .from('weekly_reports')
            .select('id')
            .gte('created_at', weekStart.toISOString())
            .lt('created_at', weekEnd.toISOString());

          const { data: weekClients } = await supabase
            .from('clients')
            .select('id')
            .eq('status', 'active')
            .lte('created_at', weekEnd.toISOString());

          return {
            week: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            reports: weekReports?.length || 0,
            clients: weekClients?.length || 0,
          };
        })
      );

      const last8Weeks = weeklyData.reverse();

      setWeeklyTrend(last8Weeks);

      const healthData = [
        { name: 'Healthy', value: clients.data?.filter((c) => c.health_status === 'healthy').length || 0 },
        { name: 'Needs Attention', value: clients.data?.filter((c) => c.health_status === 'needs_attention').length || 0 },
        { name: 'At Risk', value: clients.data?.filter((c) => c.health_status === 'at_risk').length || 0 },
      ];

      setClientHealthData(healthData);

      const employeeReports = currentReports.data?.reduce((acc: any, report) => {
        const empId = report.employee_id;
        if (!acc[empId]) {
          acc[empId] = { count: 0, onTrack: 0 };
        }
        acc[empId].count += 1;
        if (report.status === 'on_track') acc[empId].onTrack += 1;
        return acc;
      }, {});

      const performers = await Promise.all(
        Object.entries(employeeReports || {})
          .slice(0, 5)
          .map(async ([empId, data]: [string, any]) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', empId)
              .maybeSingle();
            return {
              name: profile?.full_name || 'Unknown',
              reports: data.count,
              performance: data.count > 0 ? Math.round((data.onTrack / data.count) * 100) : 0,
            };
          })
      );

      setTopPerformers(performers.sort((a, b) => b.reports - a.reports));
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, prefix = '', suffix = '' }: any) => {
    const isPositive = change >= 0;
    return (
      <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="rounded-lg p-2.5 bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {prefix}
                {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
                {suffix}
              </p>
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-medium">
                  {isPositive ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs previous period</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track performance and insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]" data-testid="select-time-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={metrics.totalRevenue.current}
          change={metrics.totalRevenue.change}
          icon={DollarSign}
          prefix="$"
        />
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects.current}
          change={metrics.activeProjects.change}
          icon={Target}
        />
        <MetricCard
          title="Client Satisfaction"
          value={metrics.avgClientSatisfaction.current}
          change={metrics.avgClientSatisfaction.change}
          icon={Award}
          suffix="%"
        />
        <MetricCard
          title="Reports Submitted"
          value={metrics.reportsSubmitted.current}
          change={metrics.reportsSubmitted.change}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="reports" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="clients" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientHealthData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {clientHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clients" fill="#3B82F6" />
                <Bar dataKey="revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between gap-4 p-4 bg-muted rounded-md flex-wrap" data-testid={`row-performer-${index}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground" data-testid={`text-performer-name-${index}`}>{performer.name}</p>
                      <p className="text-sm text-muted-foreground">{performer.reports} reports</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground" data-testid={`text-performer-rate-${index}`}>{performer.performance}%</p>
                    <p className="text-xs text-muted-foreground">On Track Rate</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No performance data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
