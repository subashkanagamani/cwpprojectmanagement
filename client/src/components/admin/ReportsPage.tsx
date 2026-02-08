import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, WeeklyReport, Profile, Service, ServiceMetric } from '../../lib/database.types';
import { Download, FileText, Filter } from 'lucide-react';
import { generateReportPDF } from '../../utils/reportPDF';
import { useToast } from '../../contexts/ToastContext';
import { ExportDialog } from '../ExportDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReportWithDetails extends WeeklyReport {
  client?: Client;
  employee?: Profile;
  service?: Service;
  metrics?: ServiceMetric;
}

export function ReportsPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('_all');
  const [selectedWeek, setSelectedWeek] = useState<string>('_all');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportsRes, clientsRes] = await Promise.all([
        supabase.from('weekly_reports').select(`
          *,
          clients(*),
          profiles(*),
          services(*),
          service_metrics(*)
        `).order('week_start_date', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
      ]);

      if (reportsRes.data) {
        const reportsWithDetails = reportsRes.data.map((report: any) => ({
          ...report,
          client: report.clients,
          employee: report.profiles,
          service: report.services,
          metrics: report.service_metrics?.[0] || undefined,
        }));
        setReports(reportsWithDetails);
      }

      if (clientsRes.data) setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (clientId: string, weekStartDate: string) => {
    const clientReports = reports.filter(
      (r) => r.client_id === clientId && r.week_start_date === weekStartDate
    );

    if (clientReports.length === 0) {
      showToast('error', 'No reports found for this week');
      return;
    }

    const report = clientReports[0];
    if (!report) return;

    try {
      generateReportPDF({
        report,
        client: report.client,
        employee: report.employee,
        service: report.service,
        metrics: report.metrics,
      });
      showToast('success', 'PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('error', 'Failed to generate PDF');
    }
  };

  const generatePDFContent = (client: Client, clientReports: ReportWithDetails[], weekStartDate: string) => {
    const teamMembers = clientReports
      .map((r) => `${r.employee?.full_name} - ${r.service?.name}`)
      .join(', ');

    const reportSections = clientReports
      .map(
        (report) => `
      <div class="report-section">
        <h3>${report.service?.name}</h3>
        <p><strong>Team Member:</strong> ${report.employee?.full_name}</p>

        <div class="status-badge ${report.status.replace('_', '-')}">
          ${report.status.replace('_', ' ').toUpperCase()}
        </div>

        <h4>Work Summary</h4>
        <p>${report.work_summary || 'N/A'}</p>

        <h4>Metrics</h4>
        <div class="metrics">
          ${formatMetrics(report.service?.slug || '', report.metrics?.metric_data)}
        </div>

        ${report.key_wins ? `<h4>Key Wins</h4><p>${report.key_wins}</p>` : ''}
        ${report.challenges ? `<h4>Challenges</h4><p>${report.challenges}</p>` : ''}
        ${report.next_week_plan ? `<h4>Next Week Plan</h4><p>${report.next_week_plan}</p>` : ''}
      </div>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Weekly Report - ${client.name}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #1f2937;
      margin: 0;
      font-size: 32px;
    }
    .client-info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .report-section {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    h3 {
      color: #2563eb;
      margin-top: 0;
      font-size: 20px;
    }
    h4 {
      color: #374151;
      margin-top: 15px;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin: 10px 0;
    }
    .status-badge.on-track {
      background: #d1fae5;
      color: #065f46;
    }
    .status-badge.needs-attention {
      background: #fef3c7;
      color: #92400e;
    }
    .status-badge.delayed {
      background: #fee2e2;
      color: #991b1b;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
    }
    .metric-item {
      padding: 8px;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Weekly Report</h1>
    <h2 style="color: #6b7280; font-weight: normal; margin: 5px 0;">${client.name}</h2>
  </div>

  <div class="client-info">
    <p><strong>Client:</strong> ${client.name}</p>
    <p><strong>Industry:</strong> ${client.industry || 'N/A'}</p>
    <p><strong>Week Starting:</strong> ${new Date(weekStartDate).toLocaleDateString()}</p>
    <p><strong>Team Members:</strong> ${teamMembers}</p>
  </div>

  ${reportSections}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString()} | ClientFlow Agency Management System</p>
  </div>
</body>
</html>
    `;
  };

  const formatMetrics = (serviceSlug: string, metrics: any) => {
    if (!metrics) return '<p>No metrics available</p>';

    const metricsMap: Record<string, Array<{ label: string; key: string }>> = {
      email_outreach: [
        { label: 'Emails Sent', key: 'emails_sent' },
        { label: 'Replies', key: 'replies' },
        { label: 'Positive Replies', key: 'positive_replies' },
        { label: 'Meetings Booked', key: 'meetings_booked' },
      ],
      linkedin_outreach: [
        { label: 'Requests Sent', key: 'connection_requests_sent' },
        { label: 'Accepted', key: 'accepted' },
        { label: 'Replies', key: 'replies' },
        { label: 'Meetings Booked', key: 'meetings_booked' },
      ],
      meta_ads: [
        { label: 'Spend', key: 'spend' },
        { label: 'Impressions', key: 'impressions' },
        { label: 'Clicks', key: 'clicks' },
        { label: 'Leads', key: 'leads' },
        { label: 'CPL', key: 'cpl' },
      ],
      google_ads: [
        { label: 'Spend', key: 'spend' },
        { label: 'Impressions', key: 'impressions' },
        { label: 'Clicks', key: 'clicks' },
        { label: 'Leads', key: 'leads' },
        { label: 'CPL', key: 'cpl' },
      ],
      seo: [
        { label: 'Keywords', key: 'keywords_worked_on' },
        { label: 'Ranking Improvements', key: 'ranking_improvements' },
        { label: 'Traffic Change', key: 'traffic_change_percent' },
        { label: 'Pages Optimized', key: 'pages_optimized' },
        { label: 'Backlinks Built', key: 'backlinks_built' },
      ],
      social_media: [
        { label: 'Posts Published', key: 'posts_published' },
        { label: 'Reach', key: 'reach' },
        { label: 'Engagement', key: 'engagement' },
        { label: 'Follower Growth', key: 'follower_growth' },
      ],
    };

    const fields = metricsMap[serviceSlug] || [];
    return fields
      .map(
        (field) => `
      <div class="metric-item">
        <div class="metric-label">${field.label}</div>
        <div class="metric-value">${metrics[field.key] ?? 'N/A'}</div>
      </div>
    `
      )
      .join('');
  };

  const filteredReports = reports.filter((report) => {
    if (selectedClient !== '_all' && report.client_id !== selectedClient) return false;
    if (selectedWeek !== '_all' && report.week_start_date !== selectedWeek) return false;
    return true;
  });

  const groupedReports = filteredReports.reduce((acc, report) => {
    const key = `${report.client_id}_${report.week_start_date}`;
    if (!acc[key]) {
      acc[key] = {
        client: report.client,
        week: report.week_start_date,
        reports: [],
      };
    }
    acc[key].reports.push(report);
    return acc;
  }, {} as Record<string, { client?: Client; week: string; reports: ReportWithDetails[] }>);

  const uniqueWeeks = Array.from(new Set(reports.map((r) => r.week_start_date))).sort().reverse();

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'on_track':
        return 'default';
      case 'needs_attention':
        return 'secondary';
      case 'delayed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div data-testid="reports-loading" className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="reports-page" className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-page-title">Reports Overview</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-page-description">View and download client weekly reports</p>
        </div>
        <Button
          data-testid="button-export-reports"
          variant="outline"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Reports
        </Button>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Reports"
        data={filteredReports}
        columns={[
          { key: 'week_start_date', label: 'Week' },
          { key: 'client', label: 'Client', format: (v: any) => v?.name || 'N/A' },
          { key: 'employee', label: 'Employee', format: (v: any) => v?.full_name || 'N/A' },
          { key: 'service', label: 'Service', format: (v: any) => v?.name || 'N/A' },
          { key: 'status', label: 'Status' },
          { key: 'work_summary', label: 'Summary' },
        ]}
        filename="reports-export"
        onDateRangeFilter={(start, end) =>
          filteredReports.filter((r) => {
            const d = r.week_start_date;
            return d >= start && d <= end;
          })
        }
      />

      <Card data-testid="reports-filter-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[200px]" data-testid="select-client-filter">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[220px]" data-testid="select-week-filter">
                <SelectValue placeholder="All Weeks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Weeks</SelectItem>
                {uniqueWeeks.map((week) => (
                  <SelectItem key={week} value={week}>
                    Week of {new Date(week).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ScrollArea>
        <div className="space-y-6">
          {Object.values(groupedReports).map(({ client, week, reports: clientReports }) => {
            if (!client) return null;

            return (
              <Card key={`${client.id}_${week}`} data-testid={`card-report-group-${client.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-client-name-${client.id}`}>{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Week of {new Date(week).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => generatePDF(client.id, week)}
                    data-testid={`button-download-pdf-${client.id}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {clientReports.map((report) => (
                      <Card key={report.id} className="bg-muted/50" data-testid={`card-report-${report.id}`}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex justify-between items-start gap-4 flex-wrap mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground" data-testid={`text-service-name-${report.id}`}>
                                {report.service?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground" data-testid={`text-employee-name-${report.id}`}>
                                {report.employee?.full_name}
                              </p>
                            </div>
                            <Badge
                              variant={getStatusVariant(report.status)}
                              data-testid={`badge-status-${report.id}`}
                            >
                              {report.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-work-summary-${report.id}`}>
                            {report.work_summary}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(groupedReports).length === 0 && (
            <Card data-testid="reports-empty-state">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" data-testid="text-empty-message">No reports found for the selected filters.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
