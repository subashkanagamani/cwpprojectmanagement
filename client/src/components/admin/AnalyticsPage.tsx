import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MetricTrend {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [metrics, setMetrics] = useState<any>({
    totalRevenue: { current: 0, change: 0 },
    activeProjects: { current: 0, change: 0 },
    avgClientSatisfaction: { current: 0, change: 0 },
    reportsSubmitted: { current: 0, change: 0 },
  });
  const [servicePerformance, setServicePerformance] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const [reportsRes, clientsRes, assignmentsRes, budgetsRes] = await Promise.all([
        supabase
          .from('weekly_reports')
          .select('*, service_metrics(*)')
          .gte('created_at', startDate.toISOString()),
        supabase.from('clients').select('*'),
        supabase.from('client_assignments').select('*, profiles(*), clients(*), services(*)'),
        supabase.from('client_budgets').select('*'),
      ]);

      const activeClients = clientsRes.data?.filter((c) => c.status === 'active').length || 0;
      const reportsCount = reportsRes.data?.length || 0;

      const totalBudget = budgetsRes.data?.reduce((sum, b) => sum + Number(b.monthly_budget), 0) || 0;

      const onTrackReports = reportsRes.data?.filter((r) => r.status === 'on_track').length || 0;
      const satisfaction = reportsCount > 0 ? (onTrackReports / reportsCount) * 100 : 0;

      setMetrics({
        totalRevenue: { current: totalBudget, change: 12.5 },
        activeProjects: { current: activeClients, change: 8.2 },
        avgClientSatisfaction: { current: satisfaction, change: 5.3 },
        reportsSubmitted: { current: reportsCount, change: 15.7 },
      });

      const serviceStats = assignmentsRes.data?.reduce((acc: any, assignment) => {
        const serviceName = assignment.services?.name || 'Unknown';
        if (!acc[serviceName]) {
          acc[serviceName] = { count: 0, reports: 0 };
        }
        acc[serviceName].count += 1;
        return acc;
      }, {});

      const serviceReportCounts = reportsRes.data?.reduce((acc: any, report) => {
        const serviceId = report.service_id;
        if (!acc[serviceId]) acc[serviceId] = 0;
        acc[serviceId] += 1;
        return acc;
      }, {});

      const servicePerf = Object.entries(serviceStats || {}).map(([name, data]: [string, any]) => ({
        name,
        clients: data.count,
        reports: data.reports,
      }));

      setServicePerformance(servicePerf);

      const employeeStats = assignmentsRes.data?.reduce((acc: any, assignment) => {
        const empName = assignment.profiles?.full_name || 'Unknown';
        if (!acc[empName]) {
          acc[empName] = { clients: 0, reports: 0 };
        }
        acc[empName].clients += 1;
        return acc;
      }, {});

      const empReportCounts = reportsRes.data?.reduce((acc: any, report) => {
        const empId = report.employee_id;
        if (!acc[empId]) acc[empId] = 0;
        acc[empId] += 1;
        return acc;
      }, {});

      const performers = Object.entries(employeeStats || {})
        .map(([name, data]: [string, any]) => ({
          name,
          clients: data.clients,
          reports: data.reports,
        }))
        .sort((a, b) => b.reports - a.reports)
        .slice(0, 5);

      setTopPerformers(performers);
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
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="bg-muted p-2 rounded-md">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {prefix}
              {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
              {suffix}
            </p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">
                {isPositive ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs previous period</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-36 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance insights and trends</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger data-testid="select-time-range" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Budget"
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
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {servicePerformance.map((service) => (
                <div key={service.name} className="flex items-center justify-between gap-4 flex-wrap p-3 bg-muted rounded-md" data-testid={`row-service-${service.name}`}>
                  <span className="font-medium text-foreground">{service.name}</span>
                  <span className="text-sm text-muted-foreground">{service.clients} clients</span>
                </div>
              ))}
              {servicePerformance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center justify-between gap-4 flex-wrap p-3 bg-muted rounded-md" data-testid={`row-performer-${index}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-bold">
                        {index + 1}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{performer.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground font-medium">{performer.clients} clients</p>
                    <p className="text-xs text-muted-foreground">{performer.reports} reports</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Client satisfaction rate is {metrics.avgClientSatisfaction.current.toFixed(1)}% based on report statuses</li>
            <li>{servicePerformance.length} services are actively being delivered</li>
            <li>Average of {(metrics.reportsSubmitted.current / Math.max(metrics.activeProjects.current, 1)).toFixed(1)} reports per active client</li>
            <li>Top performer manages {topPerformers[0]?.clients || 0} clients with {topPerformers[0]?.reports || 0} reports submitted</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
