import { useState, useEffect } from 'react';
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
  Filter,
  Zap
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { MeetingUrgencyBadge } from '../MeetingUrgencyBadge';
import { UpcomingMeetingsPriority } from './UpcomingMeetingsPriority';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
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
  clients?: {
    name: string;
  };
}

export function DailyTasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState('');

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_prioritized_tasks_for_employee', {
          p_employee_id: user!.id
        });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      showToast(
        newStatus === 'completed' ? 'Task marked as completed' : 'Task marked as pending',
        'success'
      );
      loadTasks();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const saveRemarks = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ remarks: remarksText })
        .eq('id', taskId);

      if (error) throw error;

      showToast('Remarks saved successfully', 'success');
      setEditingRemarks(null);
      setRemarksText('');
      loadTasks();
    } catch (error: any) {
      showToast(error.message, 'error');
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
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'today') {
      return isToday(parseISO(task.due_date));
    } else if (filter === 'overdue') {
      return isOverdue(task);
    }
    return true;
  });

  const sortedTasks = filteredTasks;

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(isOverdue);
  const todayTasks = tasks.filter(t => isToday(parseISO(t.due_date)));

  const clientGroups = sortedTasks.reduce((acc, task) => {
    const clientId = task.client_id || 'no-client';
    const clientName = task.clients?.name || task.client_name || 'General Tasks';
    if (!acc[clientId]) {
      acc[clientId] = { clientId, clientName, tasks: [] };
    }
    acc[clientId].tasks.push(task);
    return acc;
  }, {} as Record<string, { clientId: string; clientName: string; tasks: Task[] }>);

  const clientGroupsArray = Object.values(clientGroups);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-16" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Daily Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage your tasks and track your daily progress</p>
        </div>
      </div>

      <UpcomingMeetingsPriority />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-card-total">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Tasks</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-total-tasks">{tasks.length}</p>
              </div>
              <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-pending">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Pending</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-pending-tasks">{pendingTasks.length}</p>
              </div>
              <Circle className="h-10 w-10 text-yellow-600 dark:text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-overdue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Overdue</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-overdue-tasks">{overdueTasks.length}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-completed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Completed</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="stat-completed-tasks">{completedTasks.length}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400 opacity-50" />
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
              <Button
                variant={filter === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilter('all')}
                data-testid="filter-all"
              >
                All Tasks ({tasks.length})
              </Button>
              <Button
                variant={filter === 'today' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilter('today')}
                data-testid="filter-today"
              >
                Today ({todayTasks.length})
              </Button>
              <Button
                variant={filter === 'overdue' ? 'destructive' : 'secondary'}
                size="sm"
                onClick={() => setFilter('overdue')}
                data-testid="filter-overdue"
              >
                Overdue ({overdueTasks.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {sortedTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground text-lg">No tasks found</p>
            <p className="text-muted-foreground text-sm mt-2">
              {filter === 'all'
                ? "You don't have any tasks assigned yet"
                : `No ${filter} tasks`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {clientGroupsArray.map((group) => {
            const clientCompleted = group.tasks.filter(t => t.status === 'completed').length;
            const clientTotal = group.tasks.length;
            const clientOverdue = group.tasks.filter(isOverdue).length;

            return (
              <Card key={group.clientId} className="overflow-hidden border-2">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-3 bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.clientName}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {clientTotal} {clientTotal === 1 ? 'task' : 'tasks'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {clientOverdue > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {clientOverdue} overdue
                        </Badge>
                      )}
                      <Badge
                        variant={clientCompleted === clientTotal ? 'default' : 'secondary'}
                        className={clientCompleted === clientTotal ? 'bg-green-600 dark:bg-green-700' : ''}
                      >
                        {clientCompleted} / {clientTotal} completed
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {group.tasks.map((task) => {
                      const overdue = isOverdue(task);
                      const today = isToday(parseISO(task.due_date));
                      const expanded = expandedTasks.has(task.id);

                      return (
                        <div
                          key={task.id}
                          data-testid={`task-card-${task.id}`}
                          className={`border-2 rounded-lg ${
                            overdue && task.status === 'pending'
                              ? 'border-destructive/50 bg-destructive/5'
                              : task.status === 'completed'
                              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 opacity-75'
                              : today
                              ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleTaskComplete(task)}
                                className={`mt-1 flex-shrink-0 ${
                                  task.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                                }`}
                                data-testid={`button-toggle-task-${task.id}`}
                              >
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="h-6 w-6" />
                                ) : (
                                  <Circle className="h-6 w-6" />
                                )}
                              </Button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                                  <div className="flex-1">
                                    <h3
                                      className={`text-base font-semibold mb-2 ${
                                        task.status === 'completed'
                                          ? 'text-muted-foreground line-through'
                                          : 'text-foreground'
                                      }`}
                                    >
                                      {task.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                                        {task.priority.toUpperCase()}
                                      </Badge>

                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span className={overdue && task.status === 'pending' ? 'text-destructive font-semibold' : ''}>
                                          {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                          {today && ' (Today)'}
                                          {overdue && task.status === 'pending' && ' - OVERDUE'}
                                        </span>
                                      </div>

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
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto text-xs"
                                    onClick={() => toggleExpanded(task.id)}
                                    data-testid={`button-toggle-details-${task.id}`}
                                  >
                                    {expanded ? (
                                      <>
                                        <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                        Hide Details
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                        Show Details
                                      </>
                                    )}
                                  </Button>

                                  {task.status === 'pending' && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="p-0 h-auto text-xs text-muted-foreground"
                                      onClick={() => startEditingRemarks(task)}
                                      data-testid={`button-edit-remarks-${task.id}`}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                      {task.remarks ? 'Edit Remarks' : 'Add Remarks'}
                                    </Button>
                                  )}
                                </div>

                                {expanded && (
                                  <div className="mt-4 pt-4 border-t border-border">
                                    <div className="bg-muted rounded-md p-3">
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
                                            rows={3}
                                            className="text-sm"
                                            data-testid={`textarea-remarks-${task.id}`}
                                          />
                                          <div className="flex gap-2 flex-wrap">
                                            <Button
                                              size="sm"
                                              onClick={() => saveRemarks(task.id)}
                                              data-testid={`button-save-remarks-${task.id}`}
                                            >
                                              Save Remarks
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={() => {
                                                setEditingRemarks(null);
                                                setRemarksText('');
                                              }}
                                              data-testid={`button-cancel-remarks-${task.id}`}
                                            >
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
