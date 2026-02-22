import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileDown,
  Download,
  Eye,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  status: string;
}

interface ReportRow {
  id: string;
  week_start_date: string;
  work_summary: string | null;
  key_wins: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  status: string;
  service: { name: string } | null;
  employee: { full_name: string } | null;
  service_metrics: { metric_data: any }[];
}

interface Sections {
  workSummary: boolean;
  keyWins: boolean;
  challenges: boolean;
  nextWeekPlan: boolean;
  metrics: boolean;
}

export function ReportPDFPage() {
  const { success, error: showError } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sections, setSections] = useState<Sections>({
    workSummary: true,
    keyWins: true,
    challenges: true,
    nextWeekPlan: true,
    metrics: true,
  });
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId && startDate && endDate) {
      fetchReports();
    } else {
      setReports([]);
    }
  }, [selectedClientId, startDate, endDate]);

  async function fetchClients() {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, industry, status")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      showError("Failed to load clients");
    } finally {
      setLoadingClients(false);
    }
  }

  async function fetchReports() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select(
          "id, week_start_date, work_summary, key_wins, challenges, next_week_plan, status, service:services(name), employee:profiles(full_name), service_metrics(metric_data)"
        )
        .eq("client_id", selectedClientId)
        .gte("week_start_date", startDate)
        .lte("week_start_date", endDate)
        .is("deleted_at", null)
        .order("week_start_date", { ascending: false });
      if (error) throw error;
      setReports((data as any) || []);
    } catch (err: any) {
      showError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  function generatePDF() {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) {
      showError("Please select a client");
      return;
    }
    if (reports.length === 0) {
      showError("No reports found for the selected period");
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF();

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("ClientFlow", 20, 20);
      doc.setFontSize(12);
      doc.text(`Performance Report - ${client.name}`, 20, 32);

      doc.setTextColor(0, 0, 0);
      let y = 50;

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
      doc.text(`Period: ${startDate} to ${endDate}`, 20, y + 6);
      if (client.industry) {
        doc.text(`Industry: ${client.industry}`, 20, y + 12);
        y += 6;
      }
      y += 20;

      reports.forEach((report) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined as any, "bold");
        doc.text(`Week of ${report.week_start_date}`, 20, y);
        y += 6;

        if (report.service) {
          doc.setFontSize(9);
          doc.setFont(undefined as any, "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(`Service: ${(report.service as any).name}`, 20, y);
          y += 4;
          if (report.employee) {
            doc.text(`Employee: ${(report.employee as any).full_name}`, 20, y);
            y += 4;
          }
          doc.setTextColor(0, 0, 0);
        }
        y += 2;

        doc.setFontSize(10);
        doc.setFont(undefined as any, "normal");

        if (sections.workSummary && report.work_summary) {
          doc.setFont(undefined as any, "bold");
          doc.text("Work Summary:", 20, y);
          y += 5;
          doc.setFont(undefined as any, "normal");
          const lines = doc.splitTextToSize(report.work_summary, 170);
          if (y + lines.length * 5 > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, 20, y);
          y += lines.length * 5 + 5;
        }

        if (sections.keyWins && report.key_wins) {
          doc.setFont(undefined as any, "bold");
          doc.text("Key Wins:", 20, y);
          y += 5;
          doc.setFont(undefined as any, "normal");
          const lines = doc.splitTextToSize(report.key_wins, 170);
          if (y + lines.length * 5 > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, 20, y);
          y += lines.length * 5 + 5;
        }

        if (sections.challenges && report.challenges) {
          doc.setFont(undefined as any, "bold");
          doc.text("Challenges:", 20, y);
          y += 5;
          doc.setFont(undefined as any, "normal");
          const lines = doc.splitTextToSize(report.challenges, 170);
          if (y + lines.length * 5 > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, 20, y);
          y += lines.length * 5 + 5;
        }

        if (sections.nextWeekPlan && report.next_week_plan) {
          doc.setFont(undefined as any, "bold");
          doc.text("Next Week Plan:", 20, y);
          y += 5;
          doc.setFont(undefined as any, "normal");
          const lines = doc.splitTextToSize(report.next_week_plan, 170);
          if (y + lines.length * 5 > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, 20, y);
          y += lines.length * 5 + 5;
        }

        y += 10;
      });

      if (sections.metrics) {
        const metricsData: any[][] = [];
        reports.forEach((report) => {
          if (report.service_metrics && report.service_metrics.length > 0) {
            report.service_metrics.forEach((sm) => {
              if (sm.metric_data && typeof sm.metric_data === "object") {
                Object.entries(sm.metric_data as Record<string, any>).forEach(
                  ([key, value]) => {
                    metricsData.push([
                      report.week_start_date,
                      (report.service as any)?.name || "N/A",
                      key,
                      String(value),
                    ]);
                  }
                );
              }
            });
          }
        });

        if (metricsData.length > 0) {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(14);
          doc.setFont(undefined as any, "bold");
          doc.text("Metrics Summary", 20, y);
          y += 8;

          autoTable(doc, {
            startY: y,
            head: [["Week", "Service", "Metric", "Value"]],
            body: metricsData,
            theme: "grid",
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 },
          });
        }
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
        doc.text(
          "Generated by ClientFlow",
          doc.internal.pageSize.getWidth() - 20,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        );
      }

      doc.save(`${client.name.replace(/\s+/g, "_")}_Report.pdf`);
      success("PDF report generated successfully");
    } catch (err: any) {
      showError("Failed to generate PDF: " + (err.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  }

  const sectionOptions = [
    { key: "workSummary" as const, label: "Work Summary" },
    { key: "keyWins" as const, label: "Key Wins" },
    { key: "challenges" as const, label: "Challenges" },
    { key: "nextWeekPlan" as const, label: "Next Week Plan" },
    { key: "metrics" as const, label: "Metrics" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileDown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Report Generator
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate branded PDF reports for clients
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="stat-card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                {loadingClients ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Date Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Include Sections</Label>
                <div className="space-y-2">
                  {sectionOptions.map((opt) => (
                    <div
                      key={opt.key}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={opt.key}
                        checked={sections[opt.key]}
                        onCheckedChange={(checked) =>
                          setSections((prev) => ({
                            ...prev,
                            [opt.key]: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor={opt.key} className="text-sm cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={generatePDF}
                disabled={
                  !selectedClientId ||
                  !startDate ||
                  !endDate ||
                  reports.length === 0 ||
                  generating
                }
              >
                <Download className="h-4 w-4 mr-2" />
                {generating ? "Generating..." : "Generate PDF"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="stat-card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4" />
                Preview
                {reports.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {reports.length} report{reports.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedClientId || !startDate || !endDate ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    Select a client and date range to preview reports
                  </p>
                </div>
              ) : loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    No reports found for the selected period
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Week of {report.week_start_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {report.service && (
                              <span>{(report.service as any).name}</span>
                            )}
                            {report.service && report.employee && (
                              <span>·</span>
                            )}
                            {report.employee && (
                              <span>{(report.employee as any).full_name}</span>
                            )}
                          </div>
                          {report.work_summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {report.work_summary}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            report.status === "submitted"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
