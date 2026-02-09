import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import {
  Users,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Circle as CircleIcon,
  FileText,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ManagedClient {
  client_id: string;
  client_name: string;
  employee_count: number;
}

interface TeamProgress {
  employee_id: string;
  employee_name: string;
  client_id: string;
  client_name: string;
  service_id: string;
  service_name: string;
  assignment_id: string;
  log_id: string | null;
  notes: string | null;
  work_status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'review' | null;
  submission_status: 'pending' | 'submitted' | null;
  submitted_at: string | null;
  metrics: Record<string, any> | null;
}

const getStatusBadge = (workStatus: string | null, submissionStatus: string | null) => {
  if (submissionStatus === 'submitted') {
    return (
      <Badge variant="default" className="bg-green-600 dark:bg-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Submitted
      </Badge>
    );
  }

  switch (workStatus) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-600 dark:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="default" className="bg-blue-600 dark:bg-blue-700">
          <PlayCircle className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      );
    case 'on_hold':
      return (
        <Badge variant="secondary" className="bg-amber-600 dark:bg-amber-700 text-white">
          <PauseCircle className="h-3 w-3 mr-1" />
          On Hold
        </Badge>
      );
    case 'review':
      return (
        <Badge variant="secondary" className="bg-violet-600 dark:bg-violet-700 text-white">
          <Clock className="h-3 w-3 mr-1" />
          In Review
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <CircleIcon className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      );
  }
};

export function TeamProgressTracker() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [managedClients, setManagedClients] = useState<ManagedClient[]>([]);
  const [teamProgress, setTeamProgress] = useState<TeamProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, progressRes] = await Promise.all([
        supabase.rpc('get_managed_clients'),
        supabase.rpc('get_team_daily_progress', { p_log_date: selectedDate })
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (progressRes.error) throw progressRes.error;

      const clients = clientsRes.data || [];
      setManagedClients(clients);
      setTeamProgress(progressRes.data || []);

      if (clients.length > 0) {
        setExpandedClients(new Set(clients.map((c: ManagedClient) => c.client_id)));
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load team progress', 'error');
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const groupedProgress = teamProgress.reduce((acc, item) => {
    if (!acc[item.client_id]) {
      acc[item.client_id] = {
        client_id: item.client_id,
        client_name: item.client_name,
        employees: {}
      };
    }
    if (!acc[item.client_id].employees[item.employee_id]) {
      acc[item.client_id].employees[item.employee_id] = {
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        tasks: []
      };
    }
    acc[item.client_id].employees[item.employee_id].tasks.push(item);
    return acc;
  }, {} as Record<string, any>);

  const clientsArray = Object.values(groupedProgress);

  const totalSubmitted = teamProgress.filter(t => t.submission_status === 'submitted').length;
  const totalInProgress = teamProgress.filter(t => t.work_status === 'in_progress').length;
  const totalNotStarted = teamProgress.filter(t => !t.work_status || t.work_status === 'not_started').length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (managedClients.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground text-lg font-medium">Not an Account Manager</p>
            <p className="text-muted-foreground text-sm mt-2">
              You are not set as an account manager for any clients. Contact your admin if this is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team Progress Tracker</h1>
          <p className="text-sm text-muted-foreground">Monitor your team's daily progress on managed clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm font-medium text-foreground min-w-[140px] justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(selectedDate + 'T00:00:00'), 'EEE, MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Submitted</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{totalSubmitted}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/40">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">In Progress</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{totalInProgress}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Not Started</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{totalNotStarted}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted">
                <CircleIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {clientsArray.map((clientGroup) => {
          const employeesArray = Object.values(clientGroup.employees) as any[];
          const isExpanded = expandedClients.has(clientGroup.client_id);

          return (
            <Card key={clientGroup.client_id} className="border-2">
              <Collapsible open={isExpanded} onOpenChange={() => toggleClient(clientGroup.client_id)}>
                <CardHeader className="bg-muted/30 pb-4">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg p-3 bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-lg">{clientGroup.client_name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {employeesArray.length} {employeesArray.length === 1 ? 'team member' : 'team members'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {employeesArray.length}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {employeesArray.map((emp) => (
                        <div key={emp.employee_id} className="border rounded-lg bg-card">
                          <div className="p-4 border-b bg-muted/20">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/40">
                                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{emp.employee_name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {emp.tasks.length} {emp.tasks.length === 1 ? 'service' : 'services'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="space-y-3">
                              {emp.tasks.map((task: TeamProgress) => (
                                <div key={task.assignment_id} className="border rounded-lg p-3 bg-muted/5">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm font-medium">{task.service_name}</span>
                                    </div>
                                    {getStatusBadge(task.work_status, task.submission_status)}
                                  </div>

                                  {task.notes && (
                                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                        <FileText className="h-3 w-3" />
                                        <span className="font-medium">Notes:</span>
                                      </div>
                                      <p className="text-foreground whitespace-pre-wrap">{task.notes}</p>
                                    </div>
                                  )}

                                  {task.submitted_at && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Submitted at {format(new Date(task.submitted_at), 'h:mm a')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
