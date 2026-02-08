import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { RefreshCw, AlertTriangle, Activity, Calendar, CheckCircle, AlertCircle, Users, ArrowRight, Mail, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

function HealthRing({ score, size = 120, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  const getColor = (s: number) => {
    if (s >= 75) return { stroke: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    if (s >= 50) return { stroke: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { stroke: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  };

  const color = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(score)}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
}

function MiniHealthBar({ score, className = '' }: { score: number; className?: string }) {
  const getBarColor = (s: number) => {
    if (s >= 75) return 'bg-green-500 dark:bg-green-400';
    if (s >= 50) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  return (
    <div className={`h-1.5 w-full rounded-full bg-muted/60 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(score)}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

function getScoreLabel(score: number) {
  if (score >= 75) return 'Healthy';
  if (score >= 50) return 'Needs Attention';
  return 'High Risk';
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'healthy':
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800';
    case 'needs_attention':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    case 'at_risk':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
    default:
      return '';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-3.5 w-3.5" />;
    case 'needs_attention':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case 'at_risk':
      return <AlertCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
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

  const averageScore = useMemo(() => {
    if (clients.length === 0) return 0;
    return clients.reduce((sum, c) => sum + c.health_score, 0) / clients.length;
  }, [clients]);

  if (loading) {
    return (
      <div data-testid="health-dashboard-loading" className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full lg:col-span-2" />
        </div>
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="health-dashboard-page" className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-page-title">Client Health Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track client engagement and identify accounts needing attention</p>
        </div>
        <Button
          onClick={refreshHealthScores}
          disabled={refreshing}
          data-testid="button-refresh-scores"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Scores'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-testid="card-stat-total">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-muted-foreground mb-4">Overall Health</p>
            <HealthRing score={averageScore} size={140} strokeWidth={12} />
            <p className="mt-4 text-sm text-muted-foreground" data-testid="text-total-clients">
              Across <span className="font-semibold text-foreground">{clients.length}</span> active {clients.length === 1 ? 'client' : 'clients'}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-breakdown">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Health Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-green-50 dark:bg-green-950/40">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Healthy</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground" data-testid="card-stat-healthy">{healthyCount}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {clients.length > 0 ? Math.round((healthyCount / clients.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all duration-500"
                  style={{ width: `${clients.length > 0 ? (healthyCount / clients.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-amber-50 dark:bg-amber-950/40">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Needs Attention</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground" data-testid="card-stat-needs-attention">{needsAttentionCount}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {clients.length > 0 ? Math.round((needsAttentionCount / clients.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                  style={{ width: `${clients.length > 0 ? (needsAttentionCount / clients.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-red-50 dark:bg-red-950/40">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">High Risk</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground" data-testid="card-stat-at-risk">{atRiskCount}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {clients.length > 0 ? Math.round((atRiskCount / clients.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 dark:bg-red-400 transition-all duration-500"
                  style={{ width: `${clients.length > 0 ? (atRiskCount / clients.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {atRiskCount > 0 && filter === 'all' && (
        <Card className="border-red-200 dark:border-red-900/60" data-testid="card-alert-at-risk">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-md p-2 bg-red-50 dark:bg-red-950/40 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {atRiskCount} {atRiskCount === 1 ? 'client needs' : 'clients need'} immediate attention
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These accounts show low engagement or haven't had recent activity
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('at_risk')}
                data-testid="button-view-at-risk"
              >
                View
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          data-testid="button-filter-all"
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          All ({clients.length})
        </Button>
        <Button
          variant={filter === 'healthy' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('healthy')}
          data-testid="button-filter-healthy"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Healthy ({healthyCount})
        </Button>
        <Button
          variant={filter === 'needs_attention' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('needs_attention')}
          data-testid="button-filter-needs-attention"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Needs Attention ({needsAttentionCount})
        </Button>
        <Button
          variant={filter === 'at_risk' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setFilter('at_risk')}
          data-testid="button-filter-at-risk"
        >
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          High Risk ({atRiskCount})
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const daysSinceActivity = getDaysSinceActivity(client.last_activity_date);
          const statusLabel = getScoreLabel(client.health_score);

          return (
            <Card
              key={client.id}
              data-testid={`card-client-health-${client.id}`}
              className="overflow-visible"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate" data-testid={`text-client-name-${client.id}`}>
                      {client.name}
                    </h3>
                    {client.industry && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{client.industry}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-xl font-bold text-foreground leading-none" data-testid={`text-health-score-${client.id}`}>
                      {Math.round(client.health_score)}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
                  </div>
                </div>

                <MiniHealthBar score={client.health_score} className="mb-3" />

                <Badge
                  variant="outline"
                  className={`${getStatusBadgeClasses(client.health_status)} no-default-active-elevate gap-1 mb-4`}
                  data-testid={`badge-status-${client.id}`}
                >
                  {getStatusIcon(client.health_status)}
                  {statusLabel}
                </Badge>

                <div className="space-y-2.5 pt-3 border-t border-border">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    {client.last_activity_date ? (
                      <span data-testid={`text-activity-${client.id}`} className={`text-xs ${daysSinceActivity >= 7 ? 'text-red-600 dark:text-red-400 font-medium' : daysSinceActivity >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {daysSinceActivity === 0
                          ? 'Active today'
                          : daysSinceActivity === 1
                          ? 'Active yesterday'
                          : `${daysSinceActivity} days since last activity`}
                      </span>
                    ) : (
                      <span data-testid={`text-activity-${client.id}`} className="text-xs text-muted-foreground">No activity recorded</span>
                    )}
                  </div>

                  {client.contact_name && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{client.contact_name}</span>
                    </div>
                  )}

                  {client.assignmentCount > 0 && (
                    <div className="flex items-center gap-2.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{client.assignmentCount} team {client.assignmentCount === 1 ? 'member' : 'members'} assigned</span>
                    </div>
                  )}
                </div>

                {daysSinceActivity >= 7 && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">Overdue for check-in</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <Card data-testid="health-dashboard-empty">
          <CardContent className="py-16 text-center">
            <div className="rounded-full p-4 bg-muted/50 w-fit mx-auto mb-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1" data-testid="text-empty-message">No clients found</h3>
            <p className="text-sm text-muted-foreground">
              {filter !== 'all'
                ? `No clients are currently in the "${filter === 'at_risk' ? 'High Risk' : filter === 'needs_attention' ? 'Needs Attention' : 'Healthy'}" category`
                : 'Add active clients to start monitoring their health'}
            </p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFilter('all')}
                data-testid="button-clear-filter"
              >
                Show all clients
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
