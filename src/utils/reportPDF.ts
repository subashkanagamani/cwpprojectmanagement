import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyReport, Client, Profile, Service } from '../lib/database.types';
import { format } from 'date-fns';

interface ReportData {
  report: WeeklyReport;
  client?: Client;
  employee?: Profile;
  service?: Service;
  metrics?: any;
}

export function generateReportPDF(data: ReportData) {
  const { report, client, employee, service, metrics } = data;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('ClientFlow - Weekly Report', margin, yPosition);

  yPosition += 15;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, margin, yPosition);

  yPosition += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const infoData = [
    ['Client', client?.name || 'N/A'],
    ['Service', service?.name || 'N/A'],
    ['Employee', employee?.full_name || 'N/A'],
    ['Week Start Date', format(new Date(report.week_start_date), 'MMM dd, yyyy')],
    ['Status', report.status.replace('_', ' ').toUpperCase()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: infoData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Work Summary', margin, yPosition);
  yPosition += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(report.work_summary || 'No summary provided', pageWidth - 2 * margin);
  doc.text(summaryLines, margin, yPosition);
  yPosition += summaryLines.length * 5 + 10;

  if (report.key_wins) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Key Wins', margin, yPosition);
    yPosition += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const winsLines = doc.splitTextToSize(report.key_wins, pageWidth - 2 * margin);
    doc.text(winsLines, margin, yPosition);
    yPosition += winsLines.length * 5 + 10;
  }

  if (report.challenges) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Challenges / Blockers', margin, yPosition);
    yPosition += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const challengesLines = doc.splitTextToSize(report.challenges, pageWidth - 2 * margin);
    doc.text(challengesLines, margin, yPosition);
    yPosition += challengesLines.length * 5 + 10;
  }

  if (report.next_week_plan) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Next Week Plan', margin, yPosition);
    yPosition += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const planLines = doc.splitTextToSize(report.next_week_plan, pageWidth - 2 * margin);
    doc.text(planLines, margin, yPosition);
    yPosition += planLines.length * 5 + 10;
  }

  if (metrics) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Metrics', margin, yPosition);
    yPosition += 7;

    const metricsData: any[] = [];

    if (service?.slug === 'linkedin_outreach') {
      metricsData.push(
        ['Connections Sent', metrics.connections_sent?.toString() || '0'],
        ['Connections Accepted', metrics.connections_accepted?.toString() || '0'],
        ['Responses Received', metrics.responses_received?.toString() || '0'],
        ['Positive Responses', metrics.positive_responses?.toString() || '0'],
        ['Meetings Booked', metrics.meetings_booked?.toString() || '0']
      );
    } else if (metrics.metric_data) {
      Object.entries(metrics.metric_data).forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        metricsData.push([label, String(value)]);
      });
    }

    if (metricsData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: metricsData,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 'auto' },
        },
        margin: { left: margin },
        headStyles: { fillColor: [30, 64, 175] },
      });
    }
  }

  const filename = `report-${client?.name?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${format(
    new Date(report.week_start_date),
    'yyyy-MM-dd'
  )}.pdf`;

  doc.save(filename);
}

export function generateBulkReportsPDF(reports: ReportData[]) {
  const doc = new jsPDF();

  reports.forEach((reportData, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const { report, client, employee, service, metrics } = reportData;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;

    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text(`Report ${index + 1} of ${reports.length}`, margin, yPosition);

    yPosition += 10;
    doc.setFontSize(14);
    doc.text(client?.name || 'Unknown Client', margin, yPosition);

    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Week: ${format(new Date(report.week_start_date), 'MMM dd, yyyy')} | ${service?.name || 'N/A'}`, margin, yPosition);

    yPosition += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const summaryLines = doc.splitTextToSize(report.work_summary || 'No summary', pageWidth - 2 * margin);
    doc.text(summaryLines, margin, yPosition);
  });

  const filename = `reports-bulk-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
  doc.save(filename);
}
