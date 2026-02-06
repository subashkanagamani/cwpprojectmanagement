import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ClientHealthIndicator } from '../ClientHealthIndicator';
import { RefreshCw, TrendingDown, AlertTriangle, Activity, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ClientHealth {
  id: string;
  name: string;
  industry?: string;
  health_status: 'healthy' | 'needs_attention' | 'at_risk';
  health_score: number;
  last_activity_date?: string;
  contact_name?: string;
  contact_email?: string;
  assignmentCount: number;
}

export function ClientHealthDashboard() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'needs_attention' | 'healthy'>('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          industry,
          health_status,
          health_score,
          last_activity_date,
          contact_name,
          contact_email
        `)
        .eq('status', 'active')
        .order('health_score', { ascending: true });

      if (error) throw error;

      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client) => {
          const { count } = await supabase
            .from('client_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            assignmentCount: count || 0
          };
        })
      );

      setClients(clientsWithCounts);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshHealthScores = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.rpc('update_all_client_health_scores');

      if (error) throw error;

      showToast('Health scores updated successfully', 'success');
      await loadClients();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const getDaysSinceActivity = (lastActivity?: string) => {
    if (!lastActivity) return 999;
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredClients = clients.filter(client => {
    if (filter === 'all') return true;
    return client.health_status === filter;
  });

  const healthyCount = clients.filter(c => c.health_status === 'healthy').length;
  const needsAttentionCount = clients.filter(c => c.health_status === 'needs_attention').length;
  const atRiskCount = clients.filter(c => c.health_status === 'at_risk').length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading client health data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Health Monitoring</h1>
          <p className="text-gray-600 mt-1">Track client engagement and identify accounts needing attention</p>
        </div>
        <button
          onClick={refreshHealthScores}
          disabled={refreshing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Scores'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Total Active</p>
              <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <Activity className="h-10 w-10 text-gray-400 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border-2 border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">🟢 Healthy</p>
              <p className="text-3xl font-bold text-green-900">{healthyCount}</p>
            </div>
            <div className="text-sm text-green-700">
              {clients.length > 0 ? Math.round((healthyCount / clients.length) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border-2 border-yellow-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium mb-1">🟡 Needs Attention</p>
              <p className="text-3xl font-bold text-yellow-900">{needsAttentionCount}</p>
            </div>
            <div className="text-sm text-yellow-700">
              {clients.length > 0 ? Math.round((needsAttentionCount / clients.length) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border-2 border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium mb-1">🔴 High Risk</p>
              <p className="text-3xl font-bold text-red-900">{atRiskCount}</p>
            </div>
            <div className="text-sm text-red-700">
              {clients.length > 0 ? Math.round((atRiskCount / clients.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setFilter('at_risk')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'at_risk'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              High Risk ({atRiskCount})
            </button>
            <button
              onClick={() => setFilter('needs_attention')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'needs_attention'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Needs Attention ({needsAttentionCount})
            </button>
            <button
              onClick={() => setFilter('healthy')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'healthy'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Healthy ({healthyCount})
            </button>
          </div>
        </div>
      </div>

      {atRiskCount > 0 && filter === 'all' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Action Required</h3>
              <p className="text-red-800">
                {atRiskCount} {atRiskCount === 1 ? 'client is' : 'clients are'} at high risk.
                These accounts show no recent activity and need immediate attention.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredClients.map((client) => {
          const daysSinceActivity = getDaysSinceActivity(client.last_activity_date);

          return (
            <div
              key={client.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${
                client.health_status === 'at_risk'
                  ? 'border-red-300 bg-red-50'
                  : client.health_status === 'needs_attention'
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                    {client.industry && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {client.industry}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Health Status</p>
                      <ClientHealthIndicator
                        healthStatus={client.health_status}
                        healthScore={client.health_score}
                        showScore={true}
                        size="md"
                      />
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Activity</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {client.last_activity_date ? (
                          <div>
                            <p className={`text-sm font-medium ${daysSinceActivity >= 7 ? 'text-red-700' : daysSinceActivity >= 3 ? 'text-yellow-700' : 'text-gray-900'}`}>
                              {format(parseISO(client.last_activity_date), 'MMM d, yyyy')}
                            </p>
                            <p className={`text-xs ${daysSinceActivity >= 7 ? 'text-red-600' : daysSinceActivity >= 3 ? 'text-yellow-600' : 'text-gray-500'}`}>
                              {daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity} ${daysSinceActivity === 1 ? 'day' : 'days'} ago`}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No activity yet</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contact</p>
                      {client.contact_name ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.contact_name}</p>
                          <p className="text-xs text-gray-500">{client.contact_email}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No contact info</p>
                      )}
                    </div>
                  </div>

                  {daysSinceActivity >= 7 && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">
                        ⚠️ No activity for {daysSinceActivity} days - Immediate action required
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{Math.round(client.health_score)}</p>
                    <p className="text-xs text-gray-500">Health Score</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-lg">No clients in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
