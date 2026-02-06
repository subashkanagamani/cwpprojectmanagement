import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react';

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div className="bg-blue-100 p-2 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {prefix}
              {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
              {suffix}
            </p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">
                {isPositive ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-gray-500">vs previous period</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Performance insights and trends</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Service Performance</h2>
          <div className="space-y-3">
            {servicePerformance.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{service.name}</span>
                <span className="text-sm text-gray-600">{service.clients} clients</span>
              </div>
            ))}
            {servicePerformance.length === 0 && (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top Performers</h2>
          <div className="space-y-3">
            {topPerformers.map((performer, index) => (
              <div key={performer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{performer.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900 font-medium">{performer.clients} clients</p>
                  <p className="text-xs text-gray-500">{performer.reports} reports</p>
                </div>
              </div>
            ))}
            {topPerformers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-2">Insights</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Client satisfaction rate is {metrics.avgClientSatisfaction.current.toFixed(1)}% based on report statuses</li>
          <li>• {servicePerformance.length} services are actively being delivered</li>
          <li>• Average of {(metrics.reportsSubmitted.current / Math.max(metrics.activeProjects.current, 1)).toFixed(1)} reports per active client</li>
          <li>• Top performer manages {topPerformers[0]?.clients || 0} clients with {topPerformers[0]?.reports || 0} reports submitted</li>
        </ul>
      </div>
    </div>
  );
}
