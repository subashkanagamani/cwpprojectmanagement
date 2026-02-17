import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, Users, Activity, FileText, Target, TrendingUp, AlertCircle, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  status: string;
}

interface ClientActivity {
  id: string;
  name: string;
  tasks_count: number;
  reports_count: number;
  last_activity: string;
  health_score?: number;
}

export default function EnhancedDailyViewPage() {
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [teamActivities, setTeamActivities] = useState<TeamMemberActivity[]>([]);
  const [clientActivities, setClientActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyActivities = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tasksQuery = supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        created_at,
        assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name),
        client:clients(name)
      `)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    const reportsQuery = supabase
      .from("reports")
      .select(`
        id,
        title,
        status,
        created_at,
        employee:profiles!reports_employee_id_fkey(full_name),
        client:clients(name)
      `)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    const [tasksResult, reportsResult] = await Promise.all([
      tasksQuery,
      reportsQuery,
    ]);

    if (tasksResult.error) throw tasksResult.error;
    if (reportsResult.error) throw reportsResult.error;

    const taskActivities: DailyActivity[] = (tasksResult.data || []).map((task: any) => ({
      id: task.id,
      type: "task",
      title: task.title,
      description: task.description || "",
      employee_name: task.assigned_to_profile?.full_name || "Unassigned",
      client_name: task.client?.name,
      status: task.status,
      priority: task.priority,
      created_at: task.created_at,
      due_date: task.due_date,
    }));

    const reportActivities: DailyActivity[] = (reportsResult.data || []).map((report: any) => ({
      id: report.id,
      type: "report",
      title: report.title,
      description: "",
      employee_name: report.employee?.full_name || "Unknown",
      client_name: report.client?.name,
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

    const { data: employees, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "employee");

    if (error) throw error;

    const teamData = await Promise.all(
      (employees || []).map(async (employee) => {
        const [tasksToday, completedTasks, reportsToday, pendingTasks, activeClients] = await Promise.all([
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", employee.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString()),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", employee.id)
            .eq("status", "completed")
            .gte("updated_at", startOfDay.toISOString())
            .lte("updated_at", endOfDay.toISOString()),
          supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", employee.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString()),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", employee.id)
            .neq("status", "completed"),
          supabase
            .from("assignments")
            .select("client_id", { count: "exact" })
            .eq("employee_id", employee.id),
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
          status: (completedTasks.count || 0) >= (tasksToday.count || 0) / 2 ? "on_track" : "behind",
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

    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, health_score");

    if (error) throw error;

    const clientData = await Promise.all(
      (clients || []).map(async (client) => {
        const [tasks, reports] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, created_at", { count: "exact" })
            .eq("client_id", client.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("reports")
            .select("id, created_at", { count: "exact" })
            .eq("client_id", client.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        const lastActivity = tasks.data?.[0]?.created_at || reports.data?.[0]?.created_at || "";

        return {
          id: client.id,
          name: client.name,
          tasks_count: tasks.count || 0,
          reports_count: reports.count || 0,
          last_activity: lastActivity,
          health_score: client.health_score,
        };
      })
    );

    setClientActivities(clientData.filter(c => c.tasks_count > 0 || c.reports_count > 0));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "outline" },
      in_progress: { label: "In Progress", variant: "default" },
      completed: { label: "Completed", variant: "secondary" },
      on_track: { label: "On Track", variant: "secondary" },
      behind: { label: "Behind", variant: "destructive" },
      submitted: { label: "Submitted", variant: "default" },
      approved: { label: "Approved", variant: "secondary" },
    };
    return statusConfig[status] || { label: status, variant: "outline" };
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { variant: "default" | "secondary" | "destructive" }> = {
      low: { variant: "secondary" },
      medium: { variant: "default" },
      high: { variant: "destructive" },
    };
    return priorityConfig[priority] || { variant: "outline" };
  };

  const summaryStats = {
    totalActivities: activities.length,
    tasksCreated: activities.filter(a => a.type === "task").length,
    reportsSubmitted: activities.filter(a => a.type === "report").length,
    completedTasks: activities.filter(a => a.type === "task" && a.status === "completed").length,
    activeTeamMembers: teamActivities.filter(t => t.tasks_today > 0 || t.reports_submitted > 0).length,
    activeClients: clientActivities.length,
  };

  if (loading) {
    return <div className="p-6">Loading daily view...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Overview</h1>
          <p className="text-muted-foreground">Comprehensive view of all daily activities</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Button onClick={fetchAllActivities} size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalActivities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Created</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.tasksCreated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.reportsSubmitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.activeTeamMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.activeClients}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">All Activities</TabsTrigger>
          <TabsTrigger value="team">Team Status</TabsTrigger>
          <TabsTrigger value="clients">Client Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No activities for this date</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {activity.type === "task" ? (
                              <Target className="w-4 h-4 text-blue-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-green-500" />
                            )}
                            <h3 className="font-semibold">{activity.title}</h3>
                            <Badge variant={getStatusBadge(activity.status).variant}>
                              {getStatusBadge(activity.status).label}
                            </Badge>
                            {activity.priority && (
                              <Badge variant={getPriorityBadge(activity.priority).variant}>
                                {activity.priority}
                              </Badge>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{activity.employee_name}</span>
                            {activity.client_name && <span>• {activity.client_name}</span>}
                            <span>• {new Date(activity.created_at).toLocaleTimeString()}</span>
                            {activity.due_date && (
                              <span>• Due: {new Date(activity.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Member Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No team activities</p>
                ) : (
                  teamActivities.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {member.full_name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{member.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Badge variant={getStatusBadge(member.status).variant}>
                          {getStatusBadge(member.status).label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tasks Today:</span>
                          <span className="ml-1 font-medium">{member.tasks_today}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="ml-1 font-medium">{member.completed_tasks}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reports:</span>
                          <span className="ml-1 font-medium">{member.reports_submitted}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pending:</span>
                          <span className="ml-1 font-medium">{member.pending_tasks}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Clients:</span>
                          <span className="ml-1 font-medium">{member.active_clients}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No client activities</p>
                ) : (
                  clientActivities.map((client) => (
                    <div key={client.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{client.name}</h3>
                        {client.health_score !== undefined && (
                          <Badge variant={client.health_score >= 70 ? "secondary" : client.health_score >= 40 ? "default" : "destructive"}>
                            Health: {client.health_score}%
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tasks:</span>
                          <span className="ml-1 font-medium">{client.tasks_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reports:</span>
                          <span className="ml-1 font-medium">{client.reports_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Activity:</span>
                          <span className="ml-1 font-medium">
                            {client.last_activity ? new Date(client.last_activity).toLocaleTimeString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
