import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  Briefcase,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface ClientAssignment {
  id: string;
  client: {
    name: string;
    status: string;
    health_status: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  priority: string;
}

export function ModernEmployeeDashboard() {
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { profile } = useAuth();

  useEffect(() => {
    loadDashboard();
  }, [profile?.id]);

  const loadDashboard = async () => {
    if (!profile?.id) return;

    try {
      const [assignmentsRes, tasksRes, reportsRes] = await Promise.all([
        supabase
          .from("client_assignments")
          .select("id, clients(name, status, health_status)")
          .eq("employee_id", profile.id),
        supabase
          .from("tasks")
          .select("*")
          .eq("assigned_to", profile.id)
          .order("due_date", { ascending: true })
          .limit(5),
        supabase
          .from("weekly_reports")
          .select("*")
          .eq("employee_id", profile.id)
          .order("week_start_date", { ascending: false })
          .limit(3),
      ]);

      setAssignments(assignmentsRes.data || []);
      setTasks(tasksRes.data || []);
      setReports(reportsRes.data || []);
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

  const stats = [
    {
      label: "My Clients",
      value: assignments.length,
      icon: Briefcase,
      color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
      onClick: () => setLocation("/dashboard"),
    },
    {
      label: "Active Tasks",
      value: tasks.filter((t) => t.status !== "completed").length,
      icon: CheckCircle2,
      color: "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400",
      onClick: () => setLocation("/tasks"),
    },
    {
      label: "Reports Due",
      value: reports.filter((r) => r.status === "pending").length,
      icon: FileText,
      color: "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400",
      onClick: () => setLocation("/reports"),
    },
  ];

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {getGreeting()}, {firstName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's your work overview for today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className="p-6 hover:shadow-md transition-all cursor-pointer"
              onClick={stat.onClick}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Clients */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg text-foreground">My Clients</h3>
              <p className="text-sm text-muted-foreground">
                Clients assigned to you
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {assignments.slice(0, 5).map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.client.name}`}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(assignment.client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {assignment.client.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.client.status === "active"
                        ? "Active"
                        : "Paused"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    assignment.client.health_status === "healthy"
                      ? "default"
                      : "secondary"
                  }
                >
                  {assignment.client.health_status === "healthy"
                    ? "Healthy"
                    : "Needs Attention"}
                </Badge>
              </div>
            ))}

            {assignments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No clients assigned yet
              </div>
            )}
          </div>
        </Card>

        {/* Tasks & Quick Actions */}
        <div className="space-y-6">
          {/* Task Progress */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Task Progress</h3>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-foreground">
                    {completedTasks}/{tasks.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(taskProgress)}%
                  </span>
                </div>
                <Progress value={taskProgress} className="h-2" />
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  This Week's Tasks
                </p>
                <div className="space-y-2">
                  {tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground truncate flex-1">
                        {task.title}
                      </span>
                      <Badge
                        variant={
                          task.status === "completed" ? "default" : "secondary"
                        }
                        className="ml-2"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setLocation("/reports")}
              >
                <FileText className="h-4 w-4" />
                Submit Report
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setLocation("/tasks")}
              >
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setLocation("/calendar")}
              >
                <Calendar className="h-4 w-4" />
                View Calendar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
