import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Target,
  MessageSquare,
  Calendar,
  ChevronRight,
  User,
  BarChart3,
  Activity,
  Send,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  level: number;
}

interface TeamMemberStats {
  employee_id: string;
  employee_name: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  reports_this_week: number;
  last_report_date: string | null;
}

interface WeeklyReport {
  id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  work_summary: string;
  challenges: string;
  next_week_plan: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface DailyLog {
  id: string;
  employee_id: string;
  log_date: string;
  tasks_completed: string;
  hours_worked: number;
  notes: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface Feedback {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  created_at: string;
  from_user: {
    full_name: string;
  };
  to_user: {
    full_name: string;
  };
}

export function TeamMonitoringPage() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Get team members
      const { data: members, error: membersError } = await supabase.rpc(
        'get_team_members',
        { manager_user_id: profile?.id }
      );

      if (membersError) throw membersError;

      setTeamMembers(members || []);

      if (members && members.length > 0) {
        const memberIds = members.map((m: TeamMember) => m.id);

        // Get task statistics for each team member
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('assigned_to, status, due_date')
          .in('assigned_to', memberIds);

        if (tasksError) throw tasksError;

        // Calculate stats
        const statsMap = new Map<string, TeamMemberStats>();
        members.forEach((member: TeamMember) => {
          statsMap.set(member.id, {
            employee_id: member.id,
            employee_name: member.full_name,
            total_tasks: 0,
            completed_tasks: 0,
            pending_tasks: 0,
            overdue_tasks: 0,
            reports_this_week: 0,
            last_report_date: null,
          });
        });

        const now = new Date();
        tasks?.forEach((task: any) => {
          const stats = statsMap.get(task.assigned_to);
          if (stats) {
            stats.total_tasks++;
            if (task.status === 'completed') {
              stats.completed_tasks++;
            } else {
              stats.pending_tasks++;
              if (task.due_date && new Date(task.due_date) < now) {
                stats.overdue_tasks++;
              }
            }
          }
        });

        // Get weekly reports
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());

        const { data: reports, error: reportsError } = await supabase
          .from('weekly_reports')
          .select('*, profiles:employee_id(full_name, email)')
          .in('employee_id', memberIds)
          .gte('week_start', weekStart.toISOString())
          .lte('week_end', weekEnd.toISOString())
          .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;

        setWeeklyReports(reports || []);

        // Count reports per employee
        reports?.forEach((report: any) => {
          const stats = statsMap.get(report.employee_id);
          if (stats) {
            stats.reports_this_week++;
            if (!stats.last_report_date || report.created_at > stats.last_report_date) {
              stats.last_report_date = report.created_at;
            }
          }
        });

        // Get recent daily logs (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: logs, error: logsError } = await supabase
          .from('daily_task_logs')
          .select('*, profiles:employee_id(full_name)')
          .in('employee_id', memberIds)
          .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
          .order('log_date', { ascending: false });

        if (logsError) throw logsError;

        setDailyLogs(logs || []);
        setTeamStats(Array.from(statsMap.values()));
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim() || !selectedMember) {
      showToast('Please enter a feedback message', 'error');
      return;
    }

    try {
      setSubmittingFeedback(true);

      const { error } = await supabase.from('feedback').insert({
        from_user_id: profile?.id,
        to_user_id: selectedMember.id,
        message: feedbackMessage.trim(),
      });

      if (error) throw error;

      showToast('Feedback sent successfully', 'success');
      setShowFeedbackDialog(false);
      setFeedbackMessage('');
      setSelectedMember(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to send feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getPerformanceBadge = (stats: TeamMemberStats) => {
    if (stats.total_tasks === 0) {
      return { label: 'No Tasks', variant: 'outline' as const, color: 'text-gray-600' };
    }

    const completionRate = (stats.completed_tasks / stats.total_tasks) * 100;

    if (completionRate >= 80) {
      return { label: 'Excellent', variant: 'default' as const, color: 'text-emerald-600' };
    } else if (completionRate >= 60) {
      return { label: 'Good', variant: 'secondary' as const, color: 'text-blue-600' };
    } else if (completionRate >= 40) {
      return { label: 'Fair', variant: 'secondary' as const, color: 'text-amber-600' };
    } else {
      return { label: 'Needs Support', variant: 'destructive' as const, color: 'text-red-600' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalTasks = teamStats.reduce((sum, s) => sum + s.total_tasks, 0);
  const completedTasks = teamStats.reduce((sum, s) => sum + s.completed_tasks, 0);
  const overdueTasks = teamStats.reduce((sum, s) => sum + s.overdue_tasks, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Team Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and support your team members' work and progress
          </p>
        </div>
        <Button variant="outline" onClick={loadTeamData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              You don't have any team members assigned to you yet. Contact your administrator to set up your team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{teamMembers.length}</p>
                    <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/40">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{completionRate}%</p>
                    <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{totalTasks - completedTasks}</p>
                    <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2.5 bg-red-50 dark:bg-red-950/40">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{overdueTasks}</p>
                    <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FileText className="h-4 w-4 mr-2" />
                Weekly Reports
              </TabsTrigger>
              <TabsTrigger value="daily">
                <Calendar className="h-4 w-4 mr-2" />
                Daily Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                  <CardDescription>
                    Individual performance metrics for each team member
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teamStats.map((stats) => {
                    const member = teamMembers.find((m) => m.id === stats.employee_id);
                    const perfBadge = getPerformanceBadge(stats);

                    return (
                      <div
                        key={stats.employee_id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-blue-600 text-white font-medium">
                                {stats.employee_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground">
                                {stats.employee_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member?.role || 'Employee'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={perfBadge.variant}>{perfBadge.label}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMember(member || null);
                                setShowFeedbackDialog(true);
                              }}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Feedback
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div className="text-center p-2 rounded-md bg-muted/50">
                            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                              {stats.total_tasks}
                            </div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                          <div className="text-center p-2 rounded-md bg-muted/50">
                            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                              {stats.completed_tasks}
                            </div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                          </div>
                          <div className="text-center p-2 rounded-md bg-muted/50">
                            <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                              {stats.pending_tasks}
                            </div>
                            <div className="text-xs text-muted-foreground">Pending</div>
                          </div>
                          <div className="text-center p-2 rounded-md bg-muted/50">
                            <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                              {stats.overdue_tasks}
                            </div>
                            <div className="text-xs text-muted-foreground">Overdue</div>
                          </div>
                          <div className="text-center p-2 rounded-md bg-muted/50">
                            <div className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                              {stats.reports_this_week}
                            </div>
                            <div className="text-xs text-muted-foreground">Reports</div>
                          </div>
                        </div>

                        {stats.last_report_date && (
                          <div className="text-xs text-muted-foreground">
                            Last report: {format(new Date(stats.last_report_date), 'MMM d, yyyy h:mm a')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Reports</CardTitle>
                  <CardDescription>
                    Recent weekly reports submitted by your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weeklyReports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No weekly reports yet</p>
                    </div>
                  ) : (
                    weeklyReports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-emerald-600 text-white text-xs font-medium">
                                {report.profiles.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">
                                {report.profiles.full_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(report.week_start), 'MMM d')} -{' '}
                                {format(new Date(report.week_end), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <Badge variant={report.status === 'submitted' ? 'secondary' : 'default'}>
                            {report.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Work Summary:</span>
                            <p className="text-muted-foreground mt-1">{report.work_summary}</p>
                          </div>
                          {report.challenges && (
                            <div>
                              <span className="font-medium">Challenges:</span>
                              <p className="text-muted-foreground mt-1">{report.challenges}</p>
                            </div>
                          )}
                          {report.next_week_plan && (
                            <div>
                              <span className="font-medium">Next Week Plan:</span>
                              <p className="text-muted-foreground mt-1">{report.next_week_plan}</p>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Submitted: {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activity Logs</CardTitle>
                  <CardDescription>
                    Daily work logs from your team (last 7 days)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dailyLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No daily logs yet</p>
                    </div>
                  ) : (
                    dailyLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-600 text-white text-xs font-medium">
                                {log.profiles.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">
                                {log.profiles.full_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.log_date), 'EEEE, MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {log.hours_worked}h
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Tasks Completed:</span>
                            <p className="text-muted-foreground mt-1">{log.tasks_completed}</p>
                          </div>
                          {log.notes && (
                            <div>
                              <span className="font-medium">Notes:</span>
                              <p className="text-muted-foreground mt-1">{log.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Send feedback or encouragement to {selectedMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Write your feedback message..."
                rows={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendFeedback} disabled={submittingFeedback}>
              <Send className="h-4 w-4 mr-2" />
              {submittingFeedback ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
