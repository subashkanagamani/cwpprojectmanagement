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
  MoreHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalEmployees: number;
  pendingReports: number;
  submittedReports: number;
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

export function ModernDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalEmployees: 0,
    pendingReports: 0,
    submittedReports: 0,
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

  const loadDashboardData = async () => {
    try {
      const [clientsRes, employeesRes, reportsRes, logsRes] = await Promise.all([
        supabase.from("clients").select("id, name, status, health_status, priority").limit(10),
        supabase.from("profiles").select("id, role").eq("role", "employee"),
        supabase.from("weekly_reports").select("id, status"),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const clientData = clientsRes.data || [];
      const employeeData = employeesRes.data || [];
      const reportData = reportsRes.data || [];

      setStats({
        totalClients: clientData.length,
        activeClients: clientData.filter((c: any) => c.status === "active").length,
        totalEmployees: employeeData.length,
        pendingReports: reportData.filter((r: any) => r.status === "pending").length,
        submittedReports: reportData.filter((r: any) => r.status === "submitted").length,
        budgetUtilization: 68,
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
      change: "+12%",
      trend: "up",
      icon: Briefcase,
      color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active Projects",
      value: stats.activeClients,
      change: "+8%",
      trend: "up",
      icon: TrendingUp,
      color: "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400",
    },
    {
      label: "Team Members",
      value: stats.totalEmployees,
      change: "+3%",
      trend: "up",
      icon: Users,
      color: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
    },
    {
      label: "Reports Pending",
      value: stats.pendingReports,
      change: "-5%",
      trend: "down",
      icon: FileText,
      color: "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400",
    },
  ];

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {getGreeting()}, {firstName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's what's happening with your projects today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <Badge
                  variant="secondary"
                  className={`${
                    stat.trend === "up"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {stat.change}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Health Overview */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg text-foreground">Client Health</h3>
              <p className="text-sm text-muted-foreground">Overview of client status</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/clients")}>
              View All
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-4">
            {clients.slice(0, 6).map((client, idx) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setLocation(`/clients/${client.id}`)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials(client.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.status === "active" ? "Active Project" : "Paused"}
                    </p>
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
                    className="hidden sm:inline-flex"
                  >
                    {client.health_status === "healthy" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {client.health_status === "at_risk" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {client.health_status === "healthy"
                      ? "Healthy"
                      : client.health_status === "at_risk"
                      ? "At Risk"
                      : "Needs Attention"}
                  </Badge>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Budget Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Budget Usage</h3>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-foreground">{stats.budgetUtilization}%</span>
                  <span className="text-sm text-muted-foreground">of monthly budget</span>
                </div>
                <Progress value={stats.budgetUtilization} className="h-2" />
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-medium text-foreground">$45,000</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium text-foreground">$30,600</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.user_name || "User"}</span>{" "}
                      {activity.action} {activity.entity_type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(activity.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
