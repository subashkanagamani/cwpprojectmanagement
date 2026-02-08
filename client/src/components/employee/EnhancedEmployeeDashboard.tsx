import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment, EmployeeTask } from '../../lib/database.types';
import { Briefcase, FileText, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  service?: Service;
}

export function EnhancedEmployeeDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    reportsDueThisWeek: 0,
    tasksCompleted: 0,
    performance: 0,
  });

  useEffect(() => {
    if (user) {
      loadEmployeeData();
    }
  }, [user]);

  const loadEmployeeData = async () => {
    try {
      const [assignmentsRes, tasksRes, reportsRes] = await Promise.all([
        supabase.from('client_assignments').select('*').eq('employee_id', user!.id),
        supabase.from('employee_tasks').select('*').eq('employee_id', user!.id).order('due_date', { ascending: true }),
        supabase.from('weekly_reports').select('*').eq('employee_id', user!.id).gte('created_at', getThisMonthStart()),
      ]);

      if (assignmentsRes.data) {
        const assignmentsWithDetails = await Promise.all(
          assignmentsRes.data.map(async (assignment) => {
            const [clientRes, serviceRes] = await Promise.all([
              supabase.from('clients').select('*').eq('id', assignment.client_id).maybeSingle(),
              supabase.from('services').select('*').eq('id', assignment.service_id).maybeSingle(),
            ]);

            return {
              ...assignment,
              client: clientRes.data || undefined,
              service: serviceRes.data || undefined,
            };
          })
        );
        setAssignments(assignmentsWithDetails);

        const reports = reportsRes.data || [];
        const onTrackReports = reports.filter((r) => r.status === 'on_track').length;
        const performance = reports.length > 0 ? (onTrackReports / reports.length) * 100 : 0;

        setStats({
          totalClients: assignmentsWithDetails.length,
          reportsDueThisWeek: assignmentsWithDetails.length,
          tasksCompleted: tasksRes.data?.filter((t) => t.status === 'completed').length || 0,
          performance: Math.round(performance),
        });
      }

      if (tasksRes.data) {
        setTasks(tasksRes.data);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThisMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      await supabase.from('employee_tasks').update(updateData).eq('id', taskId);
      loadEmployeeData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getTaskPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const isTaskOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const isTaskDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const soon = addDays(new Date(), 3);
    return isAfter(due, new Date()) && isBefore(due, soon);
  };

  const groupedByClient = assignments.reduce((acc, assignment) => {
    const clientId = assignment.client_id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: assignment.client,
        services: [],
      };
    }
    if (assignment.service) {
      acc[clientId].services.push(assignment.service);
    }
    return acc;
  }, {} as Record<string, { client?: Client; services: Service[] }>);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here's your overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="stat-card-clients">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Clients</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-total-clients">{stats.totalClients}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-md">
                <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-reports">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reports Due</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-reports-due">{stats.reportsDueThisWeek}</p>
                <p className="text-xs text-muted-foreground mt-1">This week</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-md">
                <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-tasks">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-tasks-completed">{stats.tasksCompleted}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-card-performance">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground mt-2" data-testid="stat-performance">{stats.performance}%</p>
                <p className="text-xs text-muted-foreground mt-1">On-track rate</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-md">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTasks.length > 0 ? (
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      data-testid={`task-item-${task.id}`}
                      className={`p-4 rounded-md border ${
                        isTaskOverdue(task.due_date)
                          ? 'bg-destructive/10 border-destructive/30'
                          : isTaskDueSoon(task.due_date)
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-medium text-foreground">{task.title}</h3>
                            <Badge variant={getTaskPriorityVariant(task.priority)} className="text-xs">
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          {task.due_date && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                              {isTaskOverdue(task.due_date) && (
                                <span className="text-destructive font-medium ml-1">Overdue!</span>
                              )}
                              {isTaskDueSoon(task.due_date) && (
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium ml-1">Due soon</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {task.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              data-testid={`button-start-task-${task.id}`}
                            >
                              Start
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateTaskStatus(task.id, 'completed')}
                              data-testid={`button-complete-task-${task.id}`}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted rounded-md">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending tasks. Great job!</p>
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Completed
                  </h3>
                  <div className="space-y-2">
                    {completedTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-muted rounded-md" data-testid={`completed-task-${task.id}`}>
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-through">{task.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.values(groupedByClient).map(({ client, services }) => {
                  if (!client) return null;
                  return (
                    <div key={client.id} className="p-4 bg-muted rounded-md" data-testid={`client-card-${client.id}`}>
                      <h3 className="font-medium text-foreground mb-2">{client.name}</h3>
                      <div className="flex flex-wrap gap-1">
                        {services.map((service) => (
                          <Badge
                            key={service.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {service.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Object.keys(groupedByClient).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No clients assigned yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Submit Weekly Reports</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Don't forget to submit your weekly reports for all assigned clients.
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => (window.location.hash = '#reports')}
                    data-testid="link-go-to-reports"
                  >
                    Go to Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
