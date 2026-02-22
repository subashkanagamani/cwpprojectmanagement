import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Star,
  BarChart3,
  Users,
  AlertTriangle,
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface EmployeeScore {
  id: string;
  name: string;
  email: string;
  overallScore: number;
  timeliness: number;
  taskCompletion: number;
  reportQuality: number;
  consistency: number;
  totalReports: number;
  totalTasks: number;
  completedTasks: number;
  approvedReports: number;
  onTimeReports: number;
  expectedWeeks: number;
  weeksWithReports: number;
}

export function PerformanceScoringPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<EmployeeScore[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeScore | null>(null);

  useEffect(() => {
    loadAndCalculateScores();
  }, []);

  async function loadAndCalculateScores() {
    try {
      setLoading(true);

      const [employeesRes, reportsRes, tasksRes, clientsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "employee").eq("status", "active"),
        supabase.from("weekly_reports").select("*").is("deleted_at", null),
        supabase.from("tasks").select("*").is("deleted_at", null),
        supabase.from("clients").select("id, report_due_day"),
      ]);

      const employees = employeesRes.data || [];
      const reports = reportsRes.data || [];
      const tasks = tasksRes.data || [];
      const clients = clientsRes.data || [];

      const clientDueDayMap = new Map<string, number>();
      clients.forEach((c: any) => clientDueDayMap.set(c.id, c.report_due_day || 5));

      const now = new Date();

      const calculated: EmployeeScore[] = employees.map((emp: any) => {
        const empReports = reports.filter((r: any) => r.employee_id === emp.id);
        const empTasks = tasks.filter((t: any) => t.assigned_to === emp.id);

        const submittedReports = empReports.filter((r: any) => r.submitted_at);

        let onTimeCount = 0;
        submittedReports.forEach((r: any) => {
          const dueDay = clientDueDayMap.get(r.client_id) || 5;
          const weekStart = new Date(r.week_start_date);
          const dueDate = new Date(weekStart);
          dueDate.setDate(dueDate.getDate() + dueDay);
          const submittedDate = new Date(r.submitted_at);
          if (submittedDate <= dueDate) {
            onTimeCount++;
          }
        });
        const timeliness = submittedReports.length > 0
          ? Math.round((onTimeCount / submittedReports.length) * 100)
          : 0;

        const completedTasks = empTasks.filter((t: any) => t.status === "completed").length;
        const taskCompletion = empTasks.length > 0
          ? Math.round((completedTasks / empTasks.length) * 100)
          : 0;

        const approvedReports = submittedReports.filter((r: any) => r.approval_status === "approved").length;
        const reportQuality = submittedReports.length > 0
          ? Math.round((approvedReports / submittedReports.length) * 100)
          : 0;

        const empStartDate = new Date(emp.created_at);
        const weeksSinceStart = Math.max(1, Math.floor((now.getTime() - empStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const uniqueWeeks = new Set(empReports.map((r: any) => r.week_start_date)).size;
        const consistency = Math.min(100, Math.round((uniqueWeeks / weeksSinceStart) * 100));

        const overallScore = Math.round(
          timeliness * 0.3 + taskCompletion * 0.3 + reportQuality * 0.2 + consistency * 0.2
        );

        return {
          id: emp.id,
          name: emp.full_name,
          email: emp.email,
          overallScore,
          timeliness,
          taskCompletion,
          reportQuality,
          consistency,
          totalReports: submittedReports.length,
          totalTasks: empTasks.length,
          completedTasks,
          approvedReports,
          onTimeReports: onTimeCount,
          expectedWeeks: weeksSinceStart,
          weeksWithReports: uniqueWeeks,
        };
      });

      setScores(calculated);
    } catch (err) {
      showToast("Failed to load performance data", "error");
    } finally {
      setLoading(false);
    }
  }

  const filteredScores = useMemo(() => {
    let result = scores.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    result.sort((a, b) =>
      sortBy === "score" ? b.overallScore - a.overallScore : a.name.localeCompare(b.name)
    );
    return result;
  }, [scores, searchQuery, sortBy]);

  const topPerformer = useMemo(
    () => (scores.length > 0 ? scores.reduce((a, b) => (a.overallScore > b.overallScore ? a : b)) : null),
    [scores]
  );
  const avgScore = useMemo(
    () => (scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length) : 0),
    [scores]
  );
  const needsImprovement = useMemo(() => scores.filter((s) => s.overallScore < 60).length, [scores]);

  function getScoreColor(score: number) {
    if (score > 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  function getScoreBg(score: number) {
    if (score > 80) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance Scoring</h1>
        <p className="text-muted-foreground">
          Employee performance based on report timeliness, task completion, quality, and consistency.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{topPerformer?.name || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {topPerformer ? `Score: ${topPerformer.overallScore}/100` : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{avgScore}/100</div>
            <p className="text-xs text-muted-foreground">Across all employees</p>
          </CardContent>
        </Card>

        <Card className="stat-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{scores.length}</div>
            <p className="text-xs text-muted-foreground">Currently tracked</p>
          </CardContent>
        </Card>

        <Card className="stat-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Improvement</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{needsImprovement}</div>
            <p className="text-xs text-muted-foreground">Scoring below 60%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Employee Scores</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === "score" ? "name" : "score")}
              >
                Sort: {sortBy === "score" ? "Score" : "Name"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead className="text-center hidden md:table-cell">Timeliness</TableHead>
                <TableHead className="text-center hidden md:table-cell">Tasks</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Quality</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Consistency</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No employees match your search." : "No employee data available."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredScores.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {getInitials(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-bold ${getScoreBg(emp.overallScore)}`}>
                        {emp.overallScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <span className={`text-sm ${getScoreColor(emp.timeliness)}`}>{emp.timeliness}%</span>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <span className={`text-sm ${getScoreColor(emp.taskCompletion)}`}>{emp.taskCompletion}%</span>
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      <span className={`text-sm ${getScoreColor(emp.reportQuality)}`}>{emp.reportQuality}%</span>
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      <span className={`text-sm ${getScoreColor(emp.consistency)}`}>{emp.consistency}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">Stable</Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEmployee && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(selectedEmployee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div>{selectedEmployee.name}</div>
                    <p className="text-sm font-normal text-muted-foreground">{selectedEmployee.email}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-5 pt-2">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(selectedEmployee.overallScore)}`}>
                  {selectedEmployee.overallScore}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Timeliness (30%)</span>
                  </div>
                  <p className={`text-lg font-bold ${getScoreColor(selectedEmployee.timeliness)}`}>
                    {selectedEmployee.timeliness}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployee.onTimeReports}/{selectedEmployee.totalReports} on time
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Tasks (30%)</span>
                  </div>
                  <p className={`text-lg font-bold ${getScoreColor(selectedEmployee.taskCompletion)}`}>
                    {selectedEmployee.taskCompletion}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployee.completedTasks}/{selectedEmployee.totalTasks} completed
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">Quality (20%)</span>
                  </div>
                  <p className={`text-lg font-bold ${getScoreColor(selectedEmployee.reportQuality)}`}>
                    {selectedEmployee.reportQuality}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployee.approvedReports}/{selectedEmployee.totalReports} approved
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Consistency (20%)</span>
                  </div>
                  <p className={`text-lg font-bold ${getScoreColor(selectedEmployee.consistency)}`}>
                    {selectedEmployee.consistency}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployee.weeksWithReports}/{selectedEmployee.expectedWeeks} weeks
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Trend</span>
                <Badge variant="secondary">Stable</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}