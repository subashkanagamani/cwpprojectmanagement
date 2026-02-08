import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  Briefcase,
  Users,
  FileText,
  AlertCircle,
  Clock,
  TrendingUp,
  Plus,
  ArrowUpRight,
  DollarSign,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { ActivityLog } from "../../lib/database.types";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pausedClients: number;
  totalEmployees: number;
  activeEmployees: number;
  pendingReports: number;
  submittedReports: number;
  clientsNeedingAttention: number;
  budgetUtilization: number;
  totalBudget: number;
  totalSpending: number;
}

interface ClientSummary {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  priority: string;
  health_status: string;
  health_score: number | null;
}

interface WorkloadSummary {
  id: string;
  full_name: string;
  assignmentCount: number;
  maxCapacity: number;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function EnhancedDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    pausedClients: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    pendingReports: 0,
    submittedReports: 0,
    clientsNeedingAttention: 0,
    budgetUtilization: 0,
    totalBudget: 0,
    totalSpending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [recentClients, setRecentClients] = useState<ClientSummary[]>([]);
  const [allClients, setAllClients] = useState<ClientSummary[]>([]);
  const [workloads, setWorkloads] = useState<WorkloadSummary[]>([]);
  const [widgetPrefs, setWidgetPrefs] = useState<Record<string, boolean>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [, setLocation] = useLocation();
  const { profile, user } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const loadWidgetPreferences = async () => {
      try {
        if (!user?.id) {
          setPrefsLoaded(true);
          return;
        }
        const { data: widgetData } = await (supabase.from('dashboard_widgets') as any)
          .select('widget_type, is_visible')
          .eq('user_id', user.id);

        if (widgetData && widgetData.length > 0) {
          const prefs: Record<string, boolean> = {};
          widgetData.forEach((w: any) => {
            prefs[w.widget_type] = w.is_visible;
          });
          setWidgetPrefs(prefs);
        }
      } catch (error) {
        console.error("Error loading widget preferences:", error);
      } finally {
        setPrefsLoaded(true);
      }
    };

    loadWidgetPreferences();
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      const [clientsRes, employeesRes, reportsRes, assignmentsRes, budgetsRes, logsRes] =
        await Promise.all([
          supabase.from("clients").select("id, name, industry, status, priority, health_status, health_score, created_at").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, full_name, status, role, max_capacity"),
          supabase.from("weekly_reports").select("id, week_start_date, status"),
          supabase.from("client_assignments").select("id, employee_id"),
          supabase.from("client_budgets").select("client_id, monthly_budget, actual_spending"),
          supabase
            .from("activity_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

      const clients = (clientsRes.data || []) as ClientSummary[];
      const allProfiles = employeesRes.data || [];
      const employees = allProfiles.filter((e: any) => e.role === "employee");
      const reports = reportsRes.data || [];
      const assignments = (assignmentsRes.data || []) as unknown as Array<{ id: string; employee_id: string }>;
      const budgets = budgetsRes.data || [];

      const currentWeekStart = getWeekStart(new Date());
      const reportsThisWeek = reports.filter(
        (r: any) => r.week_start_date === currentWeekStart
      ).length;
      const expectedReports = assignments.length;

      const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.monthly_budget || 0), 0);
      const totalSpending = budgets.reduce((sum: number, b: any) => sum + Number(b.actual_spending || 0), 0);
      const budgetUtil = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;

      const needsAttention = clients.filter(
        (c) => c.health_status === "needs_attention" || c.health_status === "at_risk"
      ).length;

      const empAssignCounts = new Map<string, number>();
      for (const a of assignments) {
        empAssignCounts.set(a.employee_id, (empAssignCounts.get(a.employee_id) || 0) + 1);
      }

      const workloadData: WorkloadSummary[] = allProfiles.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        assignmentCount: empAssignCounts.get(p.id) || 0,
        maxCapacity: p.max_capacity || 5,
      }));

      setStats({
        totalClients: clients.length,
        activeClients: clients.filter((c) => c.status === "active").length,
        pausedClients: clients.filter((c) => c.status === "paused").length,
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e: any) => e.status === "active").length,
        pendingReports: Math.max(0, expectedReports - reportsThisWeek),
        submittedReports: reportsThisWeek,
        clientsNeedingAttention: needsAttention,
        budgetUtilization: budgetUtil,
        totalBudget,
        totalSpending,
      });

      setActivityLogs(logsRes.data || []);
      setAllClients(clients);
      setRecentClients(clients.slice(0, 5));
      setWorkloads(workloadData.sort((a, b) => b.assignmentCount - a.assignmentCount));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  };

  const formatActivityLog = (log: ActivityLog) => {
    const action = log.action || "action";
    const entity = log.entity_type || "item";
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const isWidgetVisible = (widgetType: string) => {
    if (!prefsLoaded || Object.keys(widgetPrefs).length === 0) return true;
    return widgetPrefs[widgetType] !== false;
  };

  const healthDistribution = useMemo(() => {
    const healthy = allClients.filter(c => c.health_status === 'healthy').length;
    const needsAtt = allClients.filter(c => c.health_status === 'needs_attention').length;
    const atRisk = allClients.filter(c => c.health_status === 'at_risk').length;
    const unknown = allClients.length - healthy - needsAtt - atRisk;
    return { healthy, needsAtt, atRisk, unknown };
  }, [allClients]);

  const priorityClients = useMemo(() => {
    return allClients
      .filter(c => c.priority === 'critical' || c.priority === 'high')
      .slice(0, 6);
  }, [allClients]);

  const topWorkloads = useMemo(() => {
    return workloads.filter(w => w.assignmentCount > 0).slice(0, 5);
  }, [workloads]);

  const statCards = [
    {
      label: "Total Clients",
      value: stats.totalClients,
      sub: `${stats.activeClients} active`,
      icon: Briefcase,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      href: "/clients",
    },
    {
      label: "Team Members",
      value: stats.totalEmployees,
      sub: `${stats.activeEmployees} active`,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      href: "/employees",
    },
    {
      label: "Weekly Reports",
      value: stats.submittedReports,
      sub: `${stats.pendingReports} pending`,
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      href: "/reports",
    },
    {
      label: "Budget Used",
      value: `${stats.budgetUtilization.toFixed(0)}%`,
      sub: stats.totalBudget > 0 ? `$${(stats.totalSpending / 1000).toFixed(1)}k of $${(stats.totalBudget / 1000).toFixed(1)}k` : "of monthly budget",
      icon: DollarSign,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
      href: "/budget",
    },
  ];

  const healthStatusVariant = (status: string) => {
    switch (status) {
      case "healthy":
        return "default" as const;
      case "needs_attention":
        return "secondary" as const;
      case "at_risk":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const healthStatusLabel = (status: string) => {
    switch (status) {
      case "healthy":
        return "Healthy";
      case "needs_attention":
        return "Needs Attention";
      case "at_risk":
        return "At Risk";
      default:
        return status || "Unknown";
    }
  };

  const priorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8" data-testid="dashboard-loading">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay on top of your tasks, monitor progress, and track status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="hover-elevate cursor-pointer transition-shadow"
              onClick={() => setLocation(stat.href)}
              data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-semibold mt-2 tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats.clientsNeedingAttention > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-attention-alert">
                  {stats.clientsNeedingAttention} client{stats.clientsNeedingAttention > 1 ? "s" : ""} need attention
                </p>
                <p className="text-xs text-muted-foreground">
                  Review their health status and take action.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/client-health")}
              data-testid="button-view-health"
            >
              View Details
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {isWidgetVisible('client_health') && (
        <Card data-testid="card-health-distribution">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-[15px] font-semibold">Client Health</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/client-health")}
                data-testid="button-view-all-health"
              >
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {allClients.length > 0 && (
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted" data-testid="bar-health-distribution">
                {healthDistribution.healthy > 0 && (
                  <div
                    className="bg-emerald-500 dark:bg-emerald-400"
                    style={{ width: `${(healthDistribution.healthy / allClients.length) * 100}%` }}
                  />
                )}
                {healthDistribution.needsAtt > 0 && (
                  <div
                    className="bg-amber-500 dark:bg-amber-400"
                    style={{ width: `${(healthDistribution.needsAtt / allClients.length) * 100}%` }}
                  />
                )}
                {healthDistribution.atRisk > 0 && (
                  <div
                    className="bg-red-500 dark:bg-red-400"
                    style={{ width: `${(healthDistribution.atRisk / allClients.length) * 100}%` }}
                  />
                )}
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span className="text-sm">Healthy</span>
                </div>
                <span className="text-sm font-semibold" data-testid="text-health-healthy">{healthDistribution.healthy}</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  <span className="text-sm">Needs Attention</span>
                </div>
                <span className="text-sm font-semibold" data-testid="text-health-attention">{healthDistribution.needsAtt}</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 dark:bg-red-400" />
                  <span className="text-sm">At Risk</span>
                </div>
                <span className="text-sm font-semibold" data-testid="text-health-risk">{healthDistribution.atRisk}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {isWidgetVisible('team_utilization') && (
        <Card className="lg:col-span-2" data-testid="card-team-workload">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-[15px] font-semibold">Team Workload</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/employee-workload")}
                data-testid="button-view-workload"
              >
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topWorkloads.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topWorkloads.map((emp, idx) => {
                  const percentage = Math.round((emp.assignmentCount / emp.maxCapacity) * 100);
                  const isHigh = percentage >= 75;
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <div key={emp.id} className="flex items-center gap-3" data-testid={`workload-row-${emp.id}`}>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className={`${color} text-white text-[10px] font-medium`}>
                          {getInitials(emp.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="text-[13px] font-medium truncate">{emp.full_name}</span>
                          <span className={`text-[11px] font-medium shrink-0 ${isHigh ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                            {emp.assignmentCount}/{emp.maxCapacity}
                          </span>
                        </div>
                        <Progress value={Math.min(percentage, 100)} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => setLocation("/reports")}
            data-testid="button-action-reports"
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[13px] font-medium">View Reports</span>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => setLocation("/assignments")}
            data-testid="button-action-assignments"
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[13px] font-medium">Assignments</span>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => setLocation("/clients")}
            data-testid="button-action-add-client"
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-violet-50 dark:bg-violet-950/40 p-1.5">
                <Plus className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[13px] font-medium">Add Client</span>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => setLocation("/analytics")}
            data-testid="button-action-analytics"
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[13px] font-medium">Analytics</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {isWidgetVisible('active_clients') && priorityClients.length > 0 && (
        <Card data-testid="card-priority-clients">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-[15px] font-semibold">Priority Clients</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/clients")}
                data-testid="button-view-priority-clients"
              >
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {priorityClients.map((client, idx) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/clients/${client.id}`)}
                  data-testid={`priority-client-${client.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-white text-[10px] font-medium`}>
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.industry || 'No industry'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Badge variant={priorityVariant(client.priority)} className="text-[10px]">
                      {client.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {isWidgetVisible('recent_activity') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-0.5">
                {activityLogs.map((log, i) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0"
                    data-testid={`activity-log-${i}`}
                  >
                    <div className="rounded-md bg-muted p-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium">{formatActivityLog(log)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-[15px] font-semibold">Recent Clients</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/clients")}
                data-testid="button-view-all-clients"
              >
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {recentClients.map((client, idx) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-3 flex-wrap py-3 border-b border-border/50 last:border-0 hover-elevate rounded-md px-2 -mx-2 cursor-pointer"
                  onClick={() => setLocation(`/clients/${client.id}`)}
                  data-testid={`client-${client.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-white text-[10px] font-medium`}>
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.industry || "No industry"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={healthStatusVariant(client.health_status)}>
                    {healthStatusLabel(client.health_status)}
                  </Badge>
                </div>
              ))}
              {recentClients.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 space-y-3">
                  <p className="text-sm text-muted-foreground">No clients yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/clients")}
                    data-testid="button-add-first-client"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add your first client
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
