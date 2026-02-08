import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format, subDays } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
  User,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  ClipboardCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DailyLogWithDetails {
  id: string;
  assignment_id: string;
  employee_id: string;
  client_id: string;
  service_id: string;
  log_date: string;
  metrics: Record<string, any>;
  notes: string | null;
  status: 'pending' | 'submitted';
  submitted_at: string | null;
  profiles: { full_name: string; email: string } | null;
  clients: { name: string } | null;
  services: { name: string; slug: string } | null;
}

function getServiceBadgeColor(slug: string): string {
  switch (slug) {
    case 'linkedin_outreach': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'email_outreach': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'meta_ads': return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    case 'google_ads': return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'seo': return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'social_media': return 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800';
    default: return '';
  }
}

function formatMetricKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Ctr', 'CTR')
    .replace('Cpc', 'CPC')
    .replace('Cpl', 'CPL');
}

function formatMetricValue(key: string, value: any): string {
  if (typeof value !== 'number') return String(value);
  if (key.includes('spend') || key.includes('cost') || key.includes('cpc') || key.includes('cpl')) {
    return `$${value.toFixed(2)}`;
  }
  if (key.includes('rate') || key === 'ctr' || key.includes('percent')) {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
}

export function AdminDailySubmissionsPage() {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [logs, setLogs] = useState<DailyLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_task_logs')
        .select('*, profiles!daily_task_logs_employee_id_fkey(full_name, email), clients(name), services(name, slug)')
        .eq('log_date', selectedDate)
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.profiles?.full_name?.toLowerCase().includes(q) ||
        log.clients?.name?.toLowerCase().includes(q) ||
        log.services?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const submittedCount = logs.filter(l => l.status === 'submitted').length;
  const draftCount = logs.filter(l => l.status === 'pending').length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-12" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-admin-daily-title">Daily Submissions</h1>
          <p className="text-sm text-muted-foreground">Review employee daily task submissions and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} data-testid="button-admin-prev-date">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm font-medium text-foreground min-w-[140px] justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(selectedDate + 'T00:00:00'), 'EEE, MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)} data-testid="button-admin-next-date">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="stat-admin-total">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Logs</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{logs.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-admin-submitted">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Submitted</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{submittedCount}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/40">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-admin-drafts">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Drafts</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{draftCount}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee, client, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-admin-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]" data-testid="select-admin-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending">Drafts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground text-lg font-medium">No submissions found</p>
            <p className="text-muted-foreground text-sm mt-2">
              {logs.length === 0
                ? 'No daily task logs have been submitted for this date'
                : 'No results match your current filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const metricsEntries = Object.entries(log.metrics || {}).filter(([_, v]) => v !== 0 && v !== null);

            return (
              <Card
                key={log.id}
                data-testid={`card-daily-log-${log.id}`}
                className="hover-elevate cursor-pointer"
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full p-2 bg-muted flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{log.profiles?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-3 flex-wrap mt-0.5">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {log.clients?.name || 'Unknown'}
                          </span>
                          <Badge variant="outline" className={`text-xs ${getServiceBadgeColor(log.services?.slug || '')}`}>
                            <Briefcase className="h-3 w-3 mr-1" />
                            {log.services?.name || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {log.status === 'submitted' ? (
                        <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                      {log.submitted_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.submitted_at), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border">
                      {metricsEntries.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                          {metricsEntries.map(([key, value]) => (
                            <div key={key} className="bg-muted rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">{formatMetricKey(key)}</p>
                              <p className="text-sm font-semibold text-foreground">{formatMetricValue(key, value)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-3">No metrics recorded</p>
                      )}
                      {log.notes && (
                        <div className="bg-muted rounded-md p-3">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}