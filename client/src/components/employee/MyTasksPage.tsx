import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertTriangle,
  Building2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Zap,
  Plus,
  Send,
  Save,
  Briefcase,
  Clock,
  FileText,
  Loader2,
  ClipboardCheck,
  User,
  SendHorizonal
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { MeetingUrgencyBadge } from '../MeetingUrgencyBadge';
import { UpcomingMeetingsPriority } from './UpcomingMeetingsPriority';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  created_by?: string;
  client_id?: string;
  client_name?: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  status: 'pending' | 'completed';
  completed_at?: string;
  remarks?: string;
  created_at: string;
  days_until_meeting?: number;
  meeting_priority_score?: number;
  meeting_urgency_label?: string;
  weekly_meeting_day?: number;
  meeting_time?: string;
  clients?: { name: string };
  profiles?: { full_name: string; email: string };
  creator_profile?: { full_name: string };
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
}

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

export function MyTasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('tasks');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState('');

  const [showRaiseTaskDialog, setShowRaiseTaskDialog] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [raiseTaskForm, setRaiseTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    client_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });
  const [isRaisingTask, setIsRaisingTask] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [localMetrics, setLocalMetrics] = useState<Record<string, Record<string, any>>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  const loadTasks = async () => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_prioritized_tasks_for_employee', {
          p_employee_id: user!.id
        });

      if (error) throw error;

      const tasksWithCreator = data || [];
      const creatorIds = [...new Set(tasksWithCreator.filter((t: any) => t.created_by && t.created_by !== t.assigned_to).map((t: any) => t.created_by))];

      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds as string[]);

        const creatorMap: Record<string, string> = {};
        (creators || []).forEach((c: any) => { creatorMap[c.id] = c.full_name; });

        tasksWithCreator.forEach((t: any) => {
          if (t.created_by && creatorMap[t.created_by]) {
            t.creator_profile = { full_name: creatorMap[t.created_by] };
          }
        });
      }

      setTasks(tasksWithCreator);
    } catch (error: any) {
      showToast('error', error.message);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    setSubmissionsLoading(true);
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
      showToast('error', error.message || 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [user, selectedDate]);

  const loadEmployeesAndClients = async () => {
    const [empRes, clientRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'employee').eq('status', 'active').order('full_name'),
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
    ]);
    setEmployees(empRes.data || []);
    setClients(clientRes.data || []);
  };

  useEffect(() => {
    if (user) {
      loadTasks();
      loadEmployeesAndClients();
    }
  }, [user]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const toggleTaskComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const { error } = await (supabase.from('tasks') as any)
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;
      showToast('success', newStatus === 'completed' ? 'Task marked as completed' : 'Task marked as pending');
      loadTasks();
    } catch (error: any) {
      showToast('error', error.message);
    }
  };

  const saveRemarks = async (taskId: string) => {
    try {
      const { error } = await (supabase.from('tasks') as any)
        .update({ remarks: remarksText })
        .eq('id', taskId);

      if (error) throw error;
      showToast('success', 'Remarks saved');
      setEditingRemarks(null);
      setRemarksText('');
      loadTasks();
    } catch (error: any) {
      showToast('error', error.message);
    }
  };

  const raiseTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raiseTaskForm.title || !raiseTaskForm.assigned_to || !raiseTaskForm.due_date) {
      showToast('error', 'Please fill in the task title, assign to, and due date');
      return;
    }
    setIsRaisingTask(true);
    try {
      const { error } = await (supabase.from('tasks') as any)
        .insert({
          title: raiseTaskForm.title,
          description: raiseTaskForm.description || null,
          assigned_to: raiseTaskForm.assigned_to,
          created_by: user!.id,
          client_id: raiseTaskForm.client_id || null,
          priority: raiseTaskForm.priority,
          due_date: raiseTaskForm.due_date,
        });

      if (error) throw error;

      showToast('success', 'Task request sent successfully');
      setShowRaiseTaskDialog(false);
      setRaiseTaskForm({ title: '', description: '', assigned_to: '', client_id: '', priority: 'medium', due_date: '' });
      loadTasks();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to raise task');
    } finally {
      setIsRaisingTask(false);
    }
  };

  const isOverdue = (task: Task) => {
    return task.status === 'pending' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  };

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const startEditingRemarks = (task: Task) => {
    setEditingRemarks(task.id);
    setRemarksText(task.remarks || '');
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'today') return isToday(parseISO(task.due_date));
    if (filter === 'overdue') return isOverdue(task);
    return true;
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(isOverdue);
  const todayTasks = tasks.filter(t => isToday(parseISO(t.due_date)));

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
        const { error } = await (dtl as any).insert(payload);
        if (error) throw error;
      }

      showToast('success', 'Draft saved');
      await loadSubmissions();
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
        const { error } = await (dtl as any).insert(payload);
        if (error) throw error;
      }

      showToast('success', 'Submission completed');
      await loadSubmissions();
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
  const notStartedCount = assignments.length - submittedCount - draftCount;

  if (tasksLoading && submissionsLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-my-tasks-title">My Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage your tasks, raise requests, and log daily submissions</p>
        </div>
        <Button onClick={() => setShowRaiseTaskDialog(true)} data-testid="button-raise-task">
          <Plus className="h-4 w-4 mr-1.5" />
          Raise Task Request
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList data-testid="tabs-my-tasks">
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Assigned Tasks
            {pendingTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="submissions" data-testid="tab-submissions">
            <ClipboardCheck className="h-4 w-4 mr-1.5" />
            Daily Submissions
            {notStartedCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{notStartedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6 mt-6">
          <UpcomingMeetingsPriority />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="stat-card-total">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Tasks</p>
                    <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-total-tasks">{tasks.length}</p>
                  </div>
                  <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-card-pending">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Pending</p>
                    <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-pending-tasks">{pendingTasks.length}</p>
                  </div>
                  <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                    <Circle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-card-overdue">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Overdue</p>
                    <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-overdue-tasks">{overdueTasks.length}</p>
                  </div>
                  <div className="rounded-lg p-2.5 bg-red-50 dark:bg-red-950/40">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-card-completed">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Completed</p>
                    <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-completed-tasks">{completedTasks.length}</p>
                  </div>
                  <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/40">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filter:</span>
                <div className="flex gap-2 flex-wrap">
                  <Button variant={filter === 'all' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('all')} data-testid="filter-all">
                    All Tasks ({tasks.length})
                  </Button>
                  <Button variant={filter === 'today' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('today')} data-testid="filter-today">
                    Today ({todayTasks.length})
                  </Button>
                  <Button variant={filter === 'overdue' ? 'destructive' : 'secondary'} size="sm" onClick={() => setFilter('overdue')} data-testid="filter-overdue">
                    Overdue ({overdueTasks.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground text-lg">No tasks found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {filter === 'all' ? "You don't have any tasks assigned yet" : `No ${filter} tasks`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task);
                const today = isToday(parseISO(task.due_date));
                const expanded = expandedTasks.has(task.id);
                const isRaisedByOther = task.created_by && task.created_by !== task.assigned_to;

                return (
                  <Card
                    key={task.id}
                    data-testid={`task-card-${task.id}`}
                    className={`border-2 ${
                      overdue && task.status === 'pending'
                        ? 'border-destructive/50 bg-destructive/5'
                        : task.status === 'completed'
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 opacity-75'
                        : today
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border'
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTaskComplete(task)}
                          className={`mt-1 flex-shrink-0 ${task.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
                          data-testid={`button-toggle-task-${task.id}`}
                        >
                          {task.status === 'completed' ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
                        </Button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold mb-2 ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {task.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                                  {task.priority.toUpperCase()}
                                </Badge>

                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span className={overdue && task.status === 'pending' ? 'text-destructive font-semibold' : ''}>
                                    {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                    {today && ' (Today)'}
                                    {overdue && task.status === 'pending' && ' - OVERDUE'}
                                  </span>
                                </div>

                                {(task.clients || task.client_name) && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    <span>{task.clients?.name || task.client_name}</span>
                                  </div>
                                )}

                                {isRaisedByOther && task.creator_profile && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <SendHorizonal className="h-4 w-4" />
                                    <span>From: {task.creator_profile.full_name}</span>
                                  </div>
                                )}

                                {task.meeting_urgency_label && task.days_until_meeting !== undefined && (
                                  <MeetingUrgencyBadge
                                    daysUntilMeeting={task.days_until_meeting}
                                    urgencyLabel={task.meeting_urgency_label}
                                    size="sm"
                                  />
                                )}

                                {task.status === 'completed' && task.completed_at && (
                                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                                    Completed {format(parseISO(task.completed_at), 'MMM d, h:mm a')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {overdue && task.status === 'pending' && (
                              <div className="flex-shrink-0">
                                <Badge variant="destructive" className="text-xs font-bold">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  OVERDUE
                                </Badge>
                              </div>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-muted-foreground mb-3 text-sm">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => toggleExpanded(task.id)} data-testid={`button-toggle-details-${task.id}`}>
                              {expanded ? (
                                <><ChevronUp className="h-4 w-4 mr-1" /> Hide Details</>
                              ) : (
                                <><ChevronDown className="h-4 w-4 mr-1" /> Show Details</>
                              )}
                            </Button>

                            {task.status === 'pending' && (
                              <Button variant="link" size="sm" className="p-0 h-auto text-muted-foreground" onClick={() => startEditingRemarks(task)} data-testid={`button-edit-remarks-${task.id}`}>
                                <MessageSquare className="h-4 w-4 mr-1" />
                                {task.remarks ? 'Edit Remarks' : 'Add Remarks'}
                              </Button>
                            )}
                          </div>

                          {expanded && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <div className="bg-muted rounded-md p-4">
                                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Task Remarks
                                </h4>

                                {editingRemarks === task.id ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={remarksText}
                                      onChange={(e) => setRemarksText(e.target.value)}
                                      placeholder="Add your remarks about this task..."
                                      rows={4}
                                      data-testid={`textarea-remarks-${task.id}`}
                                    />
                                    <div className="flex gap-2 flex-wrap">
                                      <Button size="sm" onClick={() => saveRemarks(task.id)} data-testid={`button-save-remarks-${task.id}`}>
                                        Save Remarks
                                      </Button>
                                      <Button size="sm" variant="secondary" onClick={() => { setEditingRemarks(null); setRemarksText(''); }} data-testid={`button-cancel-remarks-${task.id}`}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {task.remarks ? (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.remarks}</p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">No remarks added yet</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6 mt-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
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
              <Card data-testid="stat-card-not-started">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Not Started</p>
                      <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-not-started">{notStartedCount}</p>
                    </div>
                    <div className="rounded-lg p-2.5 bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
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

          {submissionsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : assignments.length === 0 ? (
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
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Submitted
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 mr-1" /> Draft
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" /> Not Started
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
                              <Button variant="outline" size="sm" onClick={() => saveDraft(assignment)} disabled={isSaving || isSubmitting} data-testid={`button-save-draft-${assignment.id}`}>
                                {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                                Save Draft
                              </Button>
                              <Button size="sm" onClick={() => submitLog(assignment)} disabled={isSaving || isSubmitting} data-testid={`button-submit-${assignment.id}`}>
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
        </TabsContent>
      </Tabs>

      <Dialog open={showRaiseTaskDialog} onOpenChange={setShowRaiseTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Raise Task Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={raiseTask} className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Task Title *</Label>
              <Input
                value={raiseTaskForm.title}
                onChange={(e) => setRaiseTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                data-testid="input-raise-task-title"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description</Label>
              <Textarea
                value={raiseTaskForm.description}
                onChange={(e) => setRaiseTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the task..."
                rows={3}
                data-testid="input-raise-task-description"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Assign To *</Label>
              <Select
                value={raiseTaskForm.assigned_to}
                onValueChange={(value) => setRaiseTaskForm(prev => ({ ...prev, assigned_to: value }))}
              >
                <SelectTrigger data-testid="select-raise-task-assignee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.id !== user?.id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {emp.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Priority</Label>
                <Select
                  value={raiseTaskForm.priority}
                  onValueChange={(value) => setRaiseTaskForm(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
                >
                  <SelectTrigger data-testid="select-raise-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Due Date *</Label>
                <Input
                  type="date"
                  value={raiseTaskForm.due_date}
                  onChange={(e) => setRaiseTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                  data-testid="input-raise-task-due-date"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Client (Optional)</Label>
              <Select
                value={raiseTaskForm.client_id}
                onValueChange={(value) => setRaiseTaskForm(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger data-testid="select-raise-task-client">
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRaiseTaskDialog(false)} data-testid="button-cancel-raise-task">
                Cancel
              </Button>
              <Button type="submit" disabled={isRaisingTask} data-testid="button-submit-raise-task">
                {isRaisingTask ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <SendHorizonal className="h-4 w-4 mr-1.5" />}
                Send Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
