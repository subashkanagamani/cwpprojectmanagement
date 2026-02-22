import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, Users, Activity, FileText, Target, AlertCircle, Briefcase, ChevronRight, RefreshCw, CalendarDays } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface DailyActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  employee_name: string;
  client_name?: string;
  status: string;
  priority?: string;
  created_at: string;
  due_date?: string;
}

interface TeamMemberActivity {
  id: string;
  full_name: string;
  email: string;
  tasks_today: number;
  completed_tasks: number;
  reports_submitted: number;
  pending_tasks: number;
  active_clients: number;
}

interface ClientActivity {
  id: string;
  name: string;
  tasks_count: number;
  reports_count: number;
  last_activity: string;
  health_status?: string;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EnhancedDailyViewPage() {
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [teamActivities, setTeamActivities] = useState<TeamMemberActivity[]>([]);
  const [clientActivities, setClientActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAllActivities();
  }, [selectedDate]);

  const fetchAllActivities = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDailyActivities(),
        fetchTeamActivities(),
        fetchClientActivities(),
      ]);
    } catch (error: any) {
      showToast(error.message || "Failed to load daily data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyActivities = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [tasksResult, reportsResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_date, created_at, assigned_to")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false }) as any,
      supabase
        .from("weekly_reports")
        .select("id, status, work_summary, created_at, employee_id, client_id")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false }) as any,
    ]);

    const empIds = new Set<string>();
    const clientIds = new Set<string>();
    (tasksResult.data || []).forEach((t: any) => {
      if (t.assigned_to) empIds.add(t.assigned_to);
      if (t.client_id) clientIds.add(t.client_id);
    });
    (reportsResult.data || []).forEach((r: any) => {
      if (r.employee_id) empIds.add(r.employee_id);
      if (r.client_id) clientIds.add(r.client_id);
    });

    const [profilesRes, clientsRes] = await Promise.all([
      empIds.size > 0
        ? (supabase.from("profiles").select("id, full_name").in("id", Array.from(empIds)) as any)
        : { data: [] },
      clientIds.size > 0
        ? (supabase.from("clients").select("id, name").in("id", Array.from(clientIds)) as any)
        : { data: [] },
    ]);

    const empMap: Record<string, string> = {};
    (profilesRes.data || []).forEach((p: any) => { empMap[p.id] = p.full_name; });
    const clientMap: Record<string, string> = {};
    (clientsRes.data || []).forEach((c: any) => { clientMap[c.id] = c.name; });

    const taskActivities: DailyActivity[] = (tasksResult.data || []).map((task: any) => ({
      id: task.id,
      type: "task",
      title: task.title,
      description: task.description || "",
      employee_name: empMap[task.assigned_to] || "Unassigned",
      client_name: clientMap[task.client_id],
      status: task.status,
      priority: task.priority,
      created_at: task.created_at,
      due_date: task.due_date,
    }));

    const reportActivities: DailyActivity[] = (reportsResult.data || []).map((report: any) => ({
      id: report.id,
      type: "report",
      title: "Weekly Report",
      description: report.work_summary || "",
      employee_name: empMap[report.employee_id] || "Unknown",
      client_name: clientMap[report.client_id],
      status: report.status,
      created_at: report.created_at,
    }));

    setActivities([...taskActivities, ...reportActivities].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  };

  const fetchTeamActivities = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: employees, error } = await (supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "employee") as any);

    if (error) throw error;

    const teamData = await Promise.all(
      (employees || []).map(async (employee: any) => {
        const [tasksToday, completedTasks, reportsToday, pendingTasks, activeClients] = await Promise.all([
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", employee.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString()) as any,
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", employee.id)
            .eq("status", "completed")
            .gte("updated_at", startOfDay.toISOString())
            .lte("updated_at", endOfDay.toISOString()) as any,
          supabase
            .from("weekly_reports")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", employee.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString()) as any,
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", employee.id)
            .neq("status", "completed") as any,
          supabase
            .from("client_assignments")
            .select("client_id", { count: "exact" })
            .eq("employee_id", employee.id) as any,
        ]);

        return {
          id: employee.id,
          full_name: employee.full_name,
          email: employee.email,
          tasks_today: tasksToday.count || 0,
          completed_tasks: completedTasks.count || 0,
          reports_submitted: reportsToday.count || 0,
          pending_tasks: pendingTasks.count || 0,
          active_clients: activeClients.data?.length || 0,
        };
      })
    );

    setTeamActivities(teamData);
  };

  const fetchClientActivities = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: clients, error } = await (supabase
      .from("clients")
      .select("id, name, health_status") as any);

    if (error) throw error;

    const clientData = await Promise.all(
      (clients || []).map(async (client: any) => {
        const [tasks, reports] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, created_at", { count: "exact" })
            .eq("client_id", client.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(1) as any,
          supabase
            .from("weekly_reports")
            .select("id, created_at", { count: "exact" })
            .eq("client_id", client.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(1) as any,
        ]);

        const lastActivity = tasks.data?.[0]?.created_at || reports.data?.[0]?.created_at || "";

        return {
          id: client.id,
          name: client.name,
          tasks_count: tasks.count || 0,
          reports_count: reports.count || 0,
          last_activity: lastActivity,
          health_status: client.health_status,
        };
      })
    );

    setClientActivities(clientData.filter((c: any) => c.tasks_count > 0 || c.reports_count > 0));
  };

  const summaryStats = {
    totalActivities: activities.length,
    tasksCreated: activities.filter(a => a.type === "task").length,
    reportsSubmitted: activities.filter(a => a.type === "report").length,
    completedTasks: activities.filter(a => a.type === "task" && a.status === "completed").length,
    activeTeamMembers: teamActivities.filter(t => t.tasks_today > 0 || t.reports_submitted > 0).length,
    activeClients: clientActivities.length,
  };

  const displayDate = format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d, yyyy");

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Daily Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">{displayDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              className="pl-9 w-[170px] h-9 text-sm"
            />
          </div>
          <Button onClick={fetchAllActivities} size="sm" variant="outline">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="animate-fade-up grid grid-cols-2 lg:grid-cols-4 gap-5" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Activities</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{summaryStats.totalActivities}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{summaryStats.tasksCreated} tasks, {summaryStats.reportsSubmitted} reports</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{summaryStats.completedTasks}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summaryStats.tasksCreated > 0 ? Math.round((summaryStats.completedTasks / summaryStats.tasksCreated) * 100) : 0}% completion
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Active Team</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{summaryStats.activeTeamMembers}</p>
                <p className="text-xs text-muted-foreground mt-0.5">of {teamActivities.length} members</p>
              </div>
              <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/30">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient orange">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Active Clients</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{summaryStats.activeClients}</p>
                <p className="text-xs text-muted-foreground mt-0.5">with activity today</p>
              </div>
              <div className="rounded-lg p-2.5 bg-orange-50 dark:bg-orange-950/30">
                <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <TabsList className="mb-4">
          <TabsTrigger value="activities">Activity Feed</TabsTrigger>
          <TabsTrigger value="team">Team Status</TabsTrigger>
          <TabsTrigger value="clients">Client Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Activity Timeline</CardTitle>
                <Badge variant="outline" className="text-[11px]">{activities.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No activities for this date</p>
                  <p className="text-xs text-muted-foreground mt-1">Select a different date or check back later</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-3 py-3 group" style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`rounded-full p-1.5 ${activity.type === 'task' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                          {activity.type === "task" ? (
                            <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        {idx < activities.length - 1 && <div className="w-px flex-1 bg-border mt-1.5" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium truncate">{activity.title}</span>
                          <Badge
                            variant={
                              activity.status === 'completed' ? 'secondary' :
                              activity.status === 'in_progress' ? 'default' :
                              'outline'
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {activity.status?.replace('_', ' ')}
                          </Badge>
                          {activity.priority && (
                            <Badge
                              variant={activity.priority === 'high' ? 'destructive' : activity.priority === 'medium' ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {activity.priority}
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{activity.employee_name}</span>
                          {activity.client_name && (
                            <>
                              <span className="text-border">&bull;</span>
                              <span>{activity.client_name}</span>
                            </>
                          )}
                          <span className="text-border">&bull;</span>
                          <span>{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Team Member Status</CardTitle>
                <Badge variant="outline" className="text-[11px]">{teamActivities.length} members</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {teamActivities.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No team members found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {teamActivities.map((member, idx) => {
                    const colorIdx = member.full_name.charCodeAt(0) % AVATAR_COLORS.length;
                    const isActive = member.tasks_today > 0 || member.reports_submitted > 0;
                    const completionRate = member.tasks_today > 0 ? Math.round((member.completed_tasks / member.tasks_today) * 100) : 0;
                    return (
                      <div key={member.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className={`${AVATAR_COLORS[colorIdx]} text-white text-xs font-semibold`}>
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{member.full_name}</span>
                            {isActive ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                        </div>
                        <div className="hidden md:flex items-center gap-5 text-center shrink-0">
                          <div>
                            <p className="text-sm font-semibold">{member.tasks_today}</p>
                            <p className="text-[10px] text-muted-foreground">Tasks</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-600">{member.completed_tasks}</p>
                            <p className="text-[10px] text-muted-foreground">Done</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{member.reports_submitted}</p>
                            <p className="text-[10px] text-muted-foreground">Reports</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-orange-600">{member.pending_tasks}</p>
                            <p className="text-[10px] text-muted-foreground">Pending</p>
                          </div>
                          <div className="w-16">
                            <Progress value={completionRate} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground mt-0.5">{completionRate}%</p>
                          </div>
                        </div>
                        <div className="md:hidden flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-medium">{member.completed_tasks}/{member.tasks_today}</p>
                            <p className="text-[10px] text-muted-foreground">tasks done</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Client Activity</CardTitle>
                <Badge variant="outline" className="text-[11px]">{clientActivities.length} active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {clientActivities.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No client activity for this date</p>
                  <p className="text-xs text-muted-foreground mt-1">Clients with tasks or reports will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientActivities.map((client) => (
                    <div key={client.id} className="rounded-xl border p-4 hover:shadow-md transition-all duration-200 group">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-sm font-semibold truncate">{client.name}</span>
                        {client.health_status && (
                          <Badge
                            variant={client.health_status === 'healthy' ? 'secondary' : client.health_status === 'at_risk' ? 'destructive' : 'outline'}
                            className="text-[10px] shrink-0"
                          >
                            {client.health_status?.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Target className="h-3 w-3" />
                          <span>{client.tasks_count} task{client.tasks_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{client.reports_count} report{client.reports_count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {client.last_activity && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Last: {new Date(client.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
