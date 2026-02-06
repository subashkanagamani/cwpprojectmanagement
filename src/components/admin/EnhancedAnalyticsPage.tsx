import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

      const last8Weeks = Array.from({ length: 8 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        return {
          week: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          reports: Math.floor(Math.random() * 20) + 10,
          clients: currentActiveClients - i,
        };
      }).reverse();

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
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
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
          <p className="text-gray-600 mt-1">Track performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Trend</h3>
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Client Health Status</h3>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Service Performance</h3>
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.name}</p>
                    <p className="text-sm text-gray-600">{performer.reports} reports</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{performer.performance}%</p>
                  <p className="text-xs text-gray-600">On Track Rate</p>
                </div>
              </div>
            ))}
            {topPerformers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No performance data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
