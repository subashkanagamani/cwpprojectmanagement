import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  Save,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

interface Assignment {
  id: string;
  client_id: string;
  employee_id: string;
  service_id: string;
  clients: { id: string; name: string };
  services: { id: string; name: string; slug: string };
}

interface DailyLog {
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
}

function getDefaultMetrics(slug: string): Record<string, any> {
  switch (slug) {
    case 'linkedin_outreach':
      return { connection_requests_sent: 0, accepted: 0, replies: 0, messages_sent: 0, meetings_booked: 0 };
    case 'email_outreach':
      return { emails_sent: 0, emails_opened: 0, replies: 0, positive_replies: 0, meetings_booked: 0 };
    case 'meta_ads':
    case 'facebook_ads':
    case 'instagram_ads':
      return { ad_spend: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0, cost_per_conversion: 0, leads: 0 };
    case 'google_ads':
      return { ad_spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, conversions: 0, conversion_rate: 0, quality_score: 0 };
    case 'seo':
      return { organic_traffic: 0, keywords_ranking: 0, top_10_keywords: 0, backlinks_acquired: 0, pages_optimized: 0, domain_authority: 0 };
    case 'social_media':
    case 'social_media_management':
      return { posts_published: 0, total_reach: 0, total_impressions: 0, engagement_rate: 0, new_followers: 0, likes: 0, comments: 0, shares: 0 };
    default:
      return {};
  }
}

function getServiceColor(slug: string): string {
  switch (slug) {
    case 'linkedin_outreach': return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';
    case 'email_outreach': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
    case 'meta_ads':
    case 'facebook_ads':
    case 'instagram_ads': return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300';
    case 'google_ads': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
    case 'seo': return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300';
    case 'social_media':
    case 'social_media_management': return 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getServiceIconColor(slug: string): string {
  switch (slug) {
    case 'linkedin_outreach': return 'bg-blue-100 dark:bg-blue-900/50';
    case 'email_outreach': return 'bg-emerald-100 dark:bg-emerald-900/50';
    case 'meta_ads':
    case 'facebook_ads':
    case 'instagram_ads': return 'bg-indigo-100 dark:bg-indigo-900/50';
    case 'google_ads': return 'bg-amber-100 dark:bg-amber-900/50';
    case 'seo': return 'bg-purple-100 dark:bg-purple-900/50';
    case 'social_media':
    case 'social_media_management': return 'bg-pink-100 dark:bg-pink-900/50';
    default: return 'bg-muted';
  }
}

type MetricFieldDef = { key: string; label: string; type: 'number' | 'decimal'; step?: string };

function getMetricFields(slug: string): MetricFieldDef[] {
  switch (slug) {
    case 'linkedin_outreach':
      return [
        { key: 'connection_requests_sent', label: 'Connection Requests Sent', type: 'number' },
        { key: 'accepted', label: 'Connections Accepted', type: 'number' },
        { key: 'messages_sent', label: 'Messages Sent', type: 'number' },
        { key: 'replies', label: 'Replies Received', type: 'number' },
        { key: 'meetings_booked', label: 'Meetings Booked', type: 'number' },
      ];
    case 'email_outreach':
      return [
        { key: 'emails_sent', label: 'Emails Sent', type: 'number' },
        { key: 'emails_opened', label: 'Emails Opened', type: 'number' },
        { key: 'replies', label: 'Replies Received', type: 'number' },
        { key: 'positive_replies', label: 'Positive Replies', type: 'number' },
        { key: 'meetings_booked', label: 'Meetings Booked', type: 'number' },
      ];
    case 'meta_ads':
    case 'facebook_ads':
    case 'instagram_ads':
      return [
        { key: 'ad_spend', label: 'Ad Spend ($)', type: 'decimal', step: '0.01' },
        { key: 'impressions', label: 'Impressions', type: 'number' },
        { key: 'clicks', label: 'Clicks', type: 'number' },
        { key: 'ctr', label: 'CTR (%)', type: 'decimal', step: '0.01' },
        { key: 'conversions', label: 'Conversions', type: 'number' },
        { key: 'cost_per_conversion', label: 'Cost per Conversion ($)', type: 'decimal', step: '0.01' },
        { key: 'leads', label: 'Leads Generated', type: 'number' },
      ];
    case 'google_ads':
      return [
        { key: 'ad_spend', label: 'Ad Spend ($)', type: 'decimal', step: '0.01' },
        { key: 'impressions', label: 'Impressions', type: 'number' },
        { key: 'clicks', label: 'Clicks', type: 'number' },
        { key: 'ctr', label: 'CTR (%)', type: 'decimal', step: '0.01' },
        { key: 'cpc', label: 'CPC ($)', type: 'decimal', step: '0.01' },
        { key: 'conversions', label: 'Conversions', type: 'number' },
        { key: 'conversion_rate', label: 'Conversion Rate (%)', type: 'decimal', step: '0.01' },
        { key: 'quality_score', label: 'Quality Score', type: 'decimal', step: '0.1' },
      ];
    case 'seo':
      return [
        { key: 'organic_traffic', label: 'Organic Traffic', type: 'number' },
        { key: 'keywords_ranking', label: 'Keywords Ranking', type: 'number' },
        { key: 'top_10_keywords', label: 'Top 10 Keywords', type: 'number' },
        { key: 'backlinks_acquired', label: 'Backlinks Acquired', type: 'number' },
        { key: 'pages_optimized', label: 'Pages Optimized', type: 'number' },
        { key: 'domain_authority', label: 'Domain Authority', type: 'decimal', step: '0.1' },
      ];
    case 'social_media':
    case 'social_media_management':
      return [
        { key: 'posts_published', label: 'Posts Published', type: 'number' },
        { key: 'total_reach', label: 'Total Reach', type: 'number' },
        { key: 'total_impressions', label: 'Total Impressions', type: 'number' },
        { key: 'engagement_rate', label: 'Engagement Rate (%)', type: 'decimal', step: '0.01' },
        { key: 'new_followers', label: 'New Followers', type: 'number' },
        { key: 'likes', label: 'Total Likes', type: 'number' },
        { key: 'comments', label: 'Comments', type: 'number' },
        { key: 'shares', label: 'Shares', type: 'number' },
      ];
    default:
      return [];
  }
}

export function DailySubmissionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [localMetrics, setLocalMetrics] = useState<Record<string, Record<string, any>>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: assignData, error: assignErr } = await supabase
        .from('client_assignments')
        .select('id, client_id, employee_id, service_id, clients(id, name), services(id, name, slug)')
        .eq('employee_id', user.id);

      if (assignErr) throw assignErr;
      setAssignments(assignData || []);

      const assignmentIds = (assignData || []).map((a: any) => a.id);
      if (assignmentIds.length > 0) {
        const { data: logsData, error: logsErr } = await supabase
          .from('daily_task_logs')
          .select('*')
          .in('assignment_id', assignmentIds)
          .eq('log_date', selectedDate);

        if (logsErr) throw logsErr;

        const logsMap: Record<string, DailyLog> = {};
        const metricsMap: Record<string, Record<string, any>> = {};
        const notesMap: Record<string, string> = {};

        (logsData || []).forEach((log: any) => {
          logsMap[log.assignment_id] = log;
          metricsMap[log.assignment_id] = log.metrics || {};
          notesMap[log.assignment_id] = log.notes || '';
        });

        (assignData || []).forEach((a: any) => {
          if (!metricsMap[a.id]) {
            metricsMap[a.id] = getDefaultMetrics(a.services?.slug || '');
          }
          if (notesMap[a.id] === undefined) {
            notesMap[a.id] = '';
          }
        });

        setDailyLogs(logsMap);
        setLocalMetrics(metricsMap);
        setLocalNotes(notesMap);
      } else {
        setDailyLogs({});
        setLocalMetrics({});
        setLocalNotes({});
      }
    } catch (error: any) {
      showToast('error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateMetric = (assignmentId: string, key: string, value: number) => {
    setLocalMetrics(prev => ({
      ...prev,
      [assignmentId]: { ...prev[assignmentId], [key]: value }
    }));
  };

  const updateNotes = (assignmentId: string, value: string) => {
    setLocalNotes(prev => ({ ...prev, [assignmentId]: value }));
  };

  const saveDraft = async (assignment: Assignment) => {
    setSavingIds(prev => new Set(prev).add(assignment.id));
    try {
      const existing = dailyLogs[assignment.id];
      const payload = {
        assignment_id: assignment.id,
        employee_id: user!.id,
        client_id: assignment.client_id,
        service_id: assignment.service_id,
        log_date: selectedDate,
        metrics: localMetrics[assignment.id] || {},
        notes: localNotes[assignment.id] || null,
        status: 'pending' as const,
      };

      const dtl = supabase.from('daily_task_logs');
      if (existing) {
        const { error } = await (dtl as any)
          .update({ metrics: payload.metrics, notes: payload.notes, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (dtl as any)
          .insert(payload);
        if (error) throw error;
      }

      showToast('success', 'Draft saved');
      await loadData();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to save draft');
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(assignment.id); return n; });
    }
  };

  const submitLog = async (assignment: Assignment) => {
    setSubmittingIds(prev => new Set(prev).add(assignment.id));
    try {
      const existing = dailyLogs[assignment.id];
      const payload = {
        assignment_id: assignment.id,
        employee_id: user!.id,
        client_id: assignment.client_id,
        service_id: assignment.service_id,
        log_date: selectedDate,
        metrics: localMetrics[assignment.id] || {},
        notes: localNotes[assignment.id] || null,
        status: 'submitted' as const,
        submitted_at: new Date().toISOString(),
      };

      const dtl = supabase.from('daily_task_logs');
      if (existing) {
        const { error } = await (dtl as any)
          .update({ metrics: payload.metrics, notes: payload.notes, status: 'submitted', submitted_at: payload.submitted_at, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (dtl as any)
          .insert(payload);
        if (error) throw error;
      }

      showToast('success', 'Submission completed');
      await loadData();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to submit');
    } finally {
      setSubmittingIds(prev => { const n = new Set(prev); n.delete(assignment.id); return n; });
    }
  };

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const submittedCount = assignments.filter(a => dailyLogs[a.id]?.status === 'submitted').length;
  const draftCount = assignments.filter(a => dailyLogs[a.id]?.status === 'pending').length;
  const pendingCount = assignments.length - submittedCount - draftCount;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        {[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-daily-submissions-title">Daily Submissions</h1>
          <p className="text-sm text-muted-foreground">Log your daily work metrics for each assigned service</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} data-testid="button-prev-date">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm font-medium text-foreground min-w-[140px] justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(selectedDate + 'T00:00:00'), 'EEE, MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)} data-testid="button-next-date">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="stat-card-submitted">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Submitted</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-submitted">{submittedCount}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/40">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-drafts">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Drafts</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-drafts">{draftCount}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-pending">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Not Started</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-pending">{pendingCount}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground text-lg font-medium">No assignments found</p>
            <p className="text-muted-foreground text-sm mt-2">You don't have any client-service assignments yet. Contact your admin to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const slug = assignment.services?.slug || '';
            const log = dailyLogs[assignment.id];
            const isSubmitted = log?.status === 'submitted';
            const isDraft = log?.status === 'pending';
            const fields = getMetricFields(slug);
            const metrics = localMetrics[assignment.id] || {};
            const notes = localNotes[assignment.id] || '';
            const isSaving = savingIds.has(assignment.id);
            const isSubmitting = submittingIds.has(assignment.id);

            return (
              <Card key={assignment.id} data-testid={`card-assignment-${assignment.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2.5 ${getServiceIconColor(slug)}`}>
                        <Briefcase className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{assignment.services?.name || 'Unknown Service'}</CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{assignment.clients?.name || 'Unknown Client'}</span>
                        </div>
                      </div>
                    </div>
                    {isSubmitted ? (
                      <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Submitted
                      </Badge>
                    ) : isDraft ? (
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Not Started
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {fields.length > 0 ? (
                    <div className="space-y-4">
                      <div className={`rounded-lg p-4 ${getServiceColor(slug)}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {fields.map((field) => (
                            <div key={field.key}>
                              <Label className="text-xs font-medium mb-1 block">{field.label}</Label>
                              <Input
                                type="number"
                                step={field.step || '1'}
                                min="0"
                                value={metrics[field.key] ?? 0}
                                onChange={(e) => {
                                  const val = field.type === 'decimal' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0;
                                  updateMetric(assignment.id, field.key, val);
                                }}
                                disabled={isSubmitted}
                                className="bg-background"
                                data-testid={`input-${slug}-${field.key}-${assignment.id}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">Notes</Label>
                        <Textarea
                          placeholder="Add any notes about today's work..."
                          value={notes}
                          onChange={(e) => updateNotes(assignment.id, e.target.value)}
                          disabled={isSubmitted}
                          rows={2}
                          data-testid={`textarea-notes-${assignment.id}`}
                        />
                      </div>

                      {!isSubmitted && (
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveDraft(assignment)}
                            disabled={isSaving || isSubmitting}
                            data-testid={`button-save-draft-${assignment.id}`}
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                            Save Draft
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => submitLog(assignment)}
                            disabled={isSaving || isSubmitting}
                            data-testid={`button-submit-${assignment.id}`}
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                            Submit
                          </Button>
                        </div>
                      )}

                      {isSubmitted && log?.submitted_at && (
                        <p className="text-xs text-muted-foreground text-right">
                          Submitted at {format(new Date(log.submitted_at), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <p className="text-sm">No metric fields configured for this service type.</p>
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