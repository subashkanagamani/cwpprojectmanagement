import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  CheckCircle,
  Clock,
  Users,
  Plus,
  TrendingUp,
  AlertCircle,
  User,
  RefreshCw,
  Target,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TeamMemberTask {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  tasks_assigned_today: number;
  tasks_completed_today: number;
  pending_tasks_count: number;
  active_clients_count: number;
  avg_task_priority: number;
}

interface AvailableTeamMember {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  pending_tasks_count: number;
  workload_score: number;
  availability_status: 'available' | 'moderate' | 'busy';
}

interface Client {
  id: string;
  name: string;
}

function getAvailabilityBadge(status: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle } {
  switch (status) {
    case 'available':
      return { label: 'Available', variant: 'secondary', icon: CheckCircle };
    case 'moderate':
      return { label: 'Moderate', variant: 'default', icon: Clock };
    case 'busy':
      return { label: 'Busy', variant: 'destructive', icon: AlertCircle };
    default:
      return { label: 'Unknown', variant: 'outline', icon: User };
  }
}

export function AccountManagerDailyView() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberTask[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    client_id: '',
    priority: 'medium',
    due_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        { data: teamData, error: teamError },
        { data: availableData, error: availableError },
        { data: clientsData, error: clientsError },
      ] = await Promise.all([
        supabase.rpc('get_account_manager_daily_tasks'),
        supabase.rpc('get_available_team_members_for_assignment'),
        supabase
          .from('client_assignments')
          .select('client_id, clients(id, name)')
          .eq('employee_id', profile?.id || '')
          .then(({ data, error }) => {
            if (error) return { data: null, error };
            const uniqueClients = data
              ?.map((item: any) => item.clients)
              .filter((client: any, index: number, self: any[]) =>
                client && self.findIndex((c: any) => c?.id === client?.id) === index
              );
            return { data: uniqueClients, error: null };
          }),
      ]);

      if (teamError) throw teamError;
      if (availableError) throw availableError;
      if (clientsError) throw clientsError;

      setTeamMembers(teamData || []);
      setAvailableMembers(availableData || []);
      setClients(clientsData || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async () => {
    if (!taskForm.title || !taskForm.client_id || !selectedEmployee) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('tasks').insert({
        title: taskForm.title,
        description: taskForm.description,
        client_id: taskForm.client_id,
        assigned_to: selectedEmployee,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'pending',
      });

      if (error) throw error;

      showToast('Task assigned successfully', 'success');
      setShowAssignTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        client_id: '',
        priority: 'medium',
        due_date: '',
      });
      setSelectedEmployee('');
      loadDashboardData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowAssignTaskModal(false);
    setSelectedEmployee('');
    setTaskForm({
      title: '',
      description: '',
      client_id: '',
      priority: 'medium',
      due_date: '',
    });
  };

  const totalAssignedToday = teamMembers.reduce((sum, member) => sum + member.tasks_assigned_today, 0);
  const totalCompletedToday = teamMembers.reduce((sum, member) => sum + member.tasks_completed_today, 0);
  const totalPending = teamMembers.reduce((sum, member) => sum + member.pending_tasks_count, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-80 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Assigned Today',
      value: totalAssignedToday,
      sub: 'Tasks given to team members',
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Completed Today',
      value: totalCompletedToday,
      sub: 'Tasks finished by team',
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Pending Tasks',
      value: totalPending,
      sub: 'Active work items',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Team Members',
      value: teamMembers.length,
      sub: 'Under your management',
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-daily-view-title">
            Account Manager Daily View
          </h1>
          <p className="text-sm text-muted-foreground">Track team progress and balance workload</p>
        </div>
        <Button variant="outline" onClick={loadDashboardData} data-testid="button-refresh-daily">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{stat.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base">Team Performance Today</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No team members found</p>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.employee_id}
                  className="rounded-md border p-4 space-y-3"
                  data-testid={`card-member-${member.employee_id}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                          {member.employee_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground" data-testid={`text-member-name-${member.employee_id}`}>
                          {member.employee_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.employee_email}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(member.employee_id);
                        setShowAssignTaskModal(true);
                      }}
                      data-testid={`button-assign-task-${member.employee_id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Assign Task
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {member.tasks_assigned_today}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Assigned</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {member.tasks_completed_today}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                        {member.pending_tasks_count}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                        {member.active_clients_count}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Clients</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base">Available for Task Assignment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No team members available</p>
              </div>
            ) : (
              availableMembers.slice(0, 10).map((member) => {
                const config = getAvailabilityBadge(member.availability_status);
                const StatusIcon = config.icon;

                return (
                  <div
                    key={member.employee_id}
                    className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-md border"
                    data-testid={`card-available-${member.employee_id}`}
                  >
                    <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-emerald-600 text-white text-xs font-medium">
                          {member.employee_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {member.employee_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.pending_tasks_count} pending tasks
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={config.variant} data-testid={`badge-status-${member.employee_id}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEmployee(member.employee_id);
                          setShowAssignTaskModal(true);
                        }}
                        data-testid={`button-assign-available-${member.employee_id}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}

            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  Available (&lt;6 tasks)
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  Moderate (6-15 tasks)
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  Busy (&gt;15 tasks)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAssignTaskModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
            <DialogDescription>Fill in the details below to assign a task to a team member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To <span className="text-destructive">*</span></Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} data-testid="select-assign-to">
                <SelectTrigger data-testid="select-trigger-assign-to">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.employee_id} value={member.employee_id}>
                      {member.employee_name} ({member.pending_tasks_count} pending tasks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client <span className="text-destructive">*</span></Label>
              <Select value={taskForm.client_id} onValueChange={(val) => setTaskForm({ ...taskForm, client_id: val })} data-testid="select-client">
                <SelectTrigger data-testid="select-trigger-client">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Enter task title"
                data-testid="input-task-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
                placeholder="Enter task description"
                data-testid="input-task-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(val) => setTaskForm({ ...taskForm, priority: val })} data-testid="select-priority">
                  <SelectTrigger data-testid="select-trigger-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  data-testid="input-due-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} data-testid="button-cancel-assign">
              Cancel
            </Button>
            <Button onClick={handleAssignTask} disabled={submitting} data-testid="button-submit-assign">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submitting ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
