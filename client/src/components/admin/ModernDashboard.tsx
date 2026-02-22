import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  Briefcase,
  Users,
  FileText,
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalEmployees: number;
  activeEmployees: number;
  pendingReports: number;
  submittedReports: number;
  totalAssignments: number;
  totalBudget: number;
  totalSpending: number;
  budgetUtilization: number;
}

interface Client {
  id: string;
  name: string;
  status: string;
  health_status: string;
  priority: string;
}

interface RecentActivity {
  id: string;
  action: string;
  user_name: string;
  entity_type: string;
  created_at: string;
}

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value.toLocaleString()}`;
}

export function ModernDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    pendingReports: 0,
    submittedReports: 0,
    totalAssignments: 0,
    totalBudget: 0,
    totalSpending: 0,
    budgetUtilization: 0,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { profile } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  };

  const loadDashboardData = async () => {
    try {
      const [clientsRes, employeesRes, assignmentsRes, reportsRes, budgetsRes, logsRes] = await Promise.all([
        supabase.from("clients").select("id, name, status, health_status, priority").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, role, status").eq("role", "employee"),
        supabase.from("client_assignments").select("id, employee_id").eq("is_active", true).is("deleted_at", null) as any,
        supabase.from("weekly_reports").select("id, week_start_date, status"),
        supabase.from("client_budgets").select("client_id, monthly_budget, actual_spending") as any,
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const clientData = (clientsRes.data || []) as Client[];
      const employeeData = employeesRes.data || [];
      const assignmentData = assignmentsRes.data || [];
      const reportData = reportsRes.data || [];
      const budgetData = budgetsRes.data || [];

      const currentWeekStart = getWeekStart(new Date());
      const reportsThisWeek = reportData.filter((r: any) => r.week_start_date === currentWeekStart);
      const submittedThisWeek = reportsThisWeek.filter((r: any) => r.status === "submitted" || r.status === "approved").length;
      const pendingThisWeek = Math.max(0, assignmentData.length - submittedThisWeek);

      const totalBudget = budgetData.reduce((sum: number, b: any) => sum + Number(b.monthly_budget || 0), 0);
      const totalSpending = budgetData.reduce((sum: number, b: any) => sum + Number(b.actual_spending || 0), 0);
      const budgetUtil = totalBudget > 0 ? Math.round((totalSpending / totalBudget) * 100) : 0;

      setStats({
        totalClients: clientData.length,
        activeClients: clientData.filter((c) => c.status === "active").length,
        totalEmployees: employeeData.length,
        activeEmployees: employeeData.filter((e: any) => e.status === "active").length,
        pendingReports: pendingThisWeek,
        submittedReports: submittedThisWeek,
        totalAssignments: assignmentData.length,
        totalBudget,
        totalSpending,
        budgetUtilization: budgetUtil,
      });

      setClients(clientData);
      setActivities(logsRes.data || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const statCards = [
    {
      label: "Total Clients",
      value: stats.totalClients,
      sub: `${stats.activeClients} active`,
      icon: Briefcase,
      gradient: "blue",
      iconBg: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      href: "/clients",
    },
    {
      label: "Active Assignments",
      value: stats.totalAssignments,
      sub: `across ${stats.activeClients} clients`,
      icon: TrendingUp,
      gradient: "green",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      href: "/assignments",
    },
    {
      label: "Team Members",
      value: stats.totalEmployees,
      sub: `${stats.activeEmployees} active`,
      icon: Users,
      gradient: "purple",
      iconBg: "bg-violet-50 dark:bg-violet-950/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      href: "/employees",
    },
    {
      label: "Reports This Week",
      value: stats.submittedReports,
      sub: `${stats.pendingReports} pending`,
      icon: FileText,
      gradient: "orange",
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      href: "/reports",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening across your agency today
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className={`stat-card-gradient ${stat.gradient} overflow-hidden animate-fade-up hover-elevate cursor-pointer transition-shadow`}
              style={{ animationDelay: `${idx * 80}ms` }}
              onClick={() => setLocation(stat.href)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg">Client Overview</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Health status of your active clients</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/clients")} className="text-primary">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-1">
              {clients.slice(0, 6).map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => setLocation(`/clients/${client.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{client.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        client.health_status === "healthy"
                          ? "default"
                          : client.health_status === "at_risk"
                          ? "destructive"
                          : "secondary"
                      }
                      className="hidden sm:inline-flex text-[11px]"
                    >
                      {client.health_status === "healthy" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {client.health_status === "at_risk" && <AlertCircle className="h-3 w-3 mr-1" />}
                      {client.health_status === "healthy"
                        ? "Healthy"
                        : client.health_status === "at_risk"
                        ? "At Risk"
                        : client.health_status === "needs_attention"
                        ? "Needs Attention"
                        : client.health_status || "Unknown"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No clients yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="animate-fade-up" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Budget Usage</CardTitle>
                <div className="p-1.5 rounded-md bg-muted">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xl font-bold text-foreground">{stats.budgetUtilization}%</span>
                    <span className="text-xs text-muted-foreground">of monthly budget</span>
                  </div>
                  <Progress value={stats.budgetUtilization} className="h-2" />
                </div>
                <div className="pt-3 border-t space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Budget</span>
                    <span className="font-semibold text-foreground">
                      {stats.totalBudget > 0 ? formatCurrency(stats.totalBudget) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-semibold text-foreground">
                      {stats.totalSpending > 0 ? formatCurrency(stats.totalSpending) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {stats.totalBudget > 0 ? formatCurrency(Math.max(0, stats.totalBudget - stats.totalSpending)) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-up" style={{ animationDelay: "500ms" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <div className="p-1.5 rounded-md bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-medium">{activity.user_name || "User"}</span>{" "}
                        {activity.action} {activity.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
