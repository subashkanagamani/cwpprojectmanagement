import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, User, Briefcase, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Report {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  employee_id: string;
  client_id: string;
  report_date: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
}

interface ConsolidatedReport {
  client: Client;
  reports: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
    report_date: string;
    created_at: string;
    employee: Employee;
  }>;
  totalReports: number;
  lastReportDate: string;
}

export default function ConsolidatedReportsPage() {
  const [consolidatedReports, setConsolidatedReports] = useState<ConsolidatedReport[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const { toast } = useToast();

  useEffect(() => {
    fetchConsolidatedReports();
  }, [selectedClient, dateRange]);

  const fetchConsolidatedReports = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      let query = supabase
        .from("reports")
        .select(`
          id,
          title,
          content,
          status,
          report_date,
          created_at,
          employee_id,
          client_id
        `)
        .gte("report_date", daysAgo.toISOString().split("T")[0])
        .order("report_date", { ascending: false });

      if (selectedClient !== "all") {
        query = query.eq("client_id", selectedClient);
      }

      const { data: reports, error: reportsError } = await query;
      if (reportsError) throw reportsError;

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (clientsError) throw clientsError;

      setClients(clientsData || []);

      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (employeesError) throw employeesError;

      const employeesMap = new Map(
        (employeesData || []).map((emp) => [emp.id, emp])
      );

      const clientsMap = new Map(
        (clientsData || []).map((client) => [client.id, client])
      );

      const grouped = new Map<string, ConsolidatedReport>();

      for (const report of reports || []) {
        const client = clientsMap.get(report.client_id);
        const employee = employeesMap.get(report.employee_id);

        if (!client || !employee) continue;

        if (!grouped.has(report.client_id)) {
          grouped.set(report.client_id, {
            client,
            reports: [],
            totalReports: 0,
            lastReportDate: report.report_date,
          });
        }

        const consolidatedReport = grouped.get(report.client_id)!;
        consolidatedReport.reports.push({
          id: report.id,
          title: report.title,
          content: report.content,
          status: report.status,
          report_date: report.report_date,
          created_at: report.created_at,
          employee,
        });
        consolidatedReport.totalReports++;

        if (report.report_date > consolidatedReport.lastReportDate) {
          consolidatedReport.lastReportDate = report.report_date;
        }
      }

      setConsolidatedReports(Array.from(grouped.values()));
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "Pending", variant: "outline" },
      submitted: { label: "Submitted", variant: "default" },
      approved: { label: "Approved", variant: "secondary" },
      rejected: { label: "Rejected", variant: "destructive" },
    };
    return statusConfig[status] || { label: status, variant: "outline" };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const exportClientReport = async (clientReport: ConsolidatedReport) => {
    const reportText = `
CLIENT REPORT: ${clientReport.client.name}
Report Period: Last ${dateRange} days
Total Reports: ${clientReport.totalReports}
Last Report Date: ${new Date(clientReport.lastReportDate).toLocaleDateString()}

REPORTS:
${clientReport.reports
  .map(
    (r, idx) => `
${idx + 1}. ${r.title}
   Date: ${new Date(r.report_date).toLocaleDateString()}
   Employee: ${r.employee.full_name}
   Status: ${r.status}
   Content:
   ${r.content}

   ---
`
  )
  .join("\n")}
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientReport.client.name.replace(/\s+/g, "_")}_report_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consolidated Client Reports</h1>
          <p className="text-muted-foreground mt-1">
            View all employee reports grouped by client
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="flex-1">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Clients</p>
                <p className="text-2xl font-bold text-foreground">{consolidatedReports.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Reports</p>
                <p className="text-2xl font-bold text-foreground">
                  {consolidatedReports.reduce((sum, cr) => sum + cr.totalReports, 0)}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Date Range</p>
                <p className="text-2xl font-bold text-foreground">{dateRange} days</p>
              </div>
              <div className="rounded-lg p-2.5 bg-purple-50 dark:bg-purple-950/30">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
        {consolidatedReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-8 w-8 opacity-40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No reports found for the selected period
              </p>
            </CardContent>
          </Card>
        ) : (
          consolidatedReports.map((clientReport) => (
            <Card key={clientReport.client.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{clientReport.client.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {clientReport.totalReports} reports • Last report:{" "}
                        {new Date(clientReport.lastReportDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportClientReport(clientReport)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientReport.reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{report.title}</h3>
                            <Badge variant={getStatusBadge(report.status).variant}>
                              {getStatusBadge(report.status).label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(report.employee.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{report.employee.full_name}</span>
                            </div>
                            <span>•</span>
                            <span>
                              {new Date(report.report_date).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>
                              Submitted: {new Date(report.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border">
                        <p className="whitespace-pre-wrap">{report.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
