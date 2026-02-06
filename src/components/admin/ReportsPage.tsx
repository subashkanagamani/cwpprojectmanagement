import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, WeeklyReport, Profile, Service, ServiceMetric } from '../../lib/database.types';
import { Download, FileText, Filter } from 'lucide-react';
import { generateReportPDF } from '../../utils/reportPDF';
import { useToast } from '../../contexts/ToastContext';

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
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');

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
      showToast('No reports found for this week', 'error');
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
      showToast('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
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
    if (selectedClient !== 'all' && report.client_id !== selectedClient) return false;
    if (selectedWeek !== 'all' && report.week_start_date !== selectedWeek) return false;
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

  if (loading) {
    return <div className="text-center py-12">Loading reports...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports Overview</h1>
        <p className="text-gray-600 mt-1">View and download client weekly reports</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Weeks</option>
            {uniqueWeeks.map((week) => (
              <option key={week} value={week}>
                Week of {new Date(week).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.values(groupedReports).map(({ client, week, reports: clientReports }) => {
          if (!client) return null;

          return (
            <div key={`${client.id}_${week}`} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Week of {new Date(week).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => generatePDF(client.id, week)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  <Download className="h-5 w-5" />
                  Download PDF
                </button>
              </div>

              <div className="p-6 space-y-4">
                {clientReports.map((report) => (
                  <div key={report.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{report.service?.name}</h4>
                        <p className="text-sm text-gray-600">{report.employee?.full_name}</p>
                      </div>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          report.status === 'on_track'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'needs_attention'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{report.work_summary}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {Object.keys(groupedReports).length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reports found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
