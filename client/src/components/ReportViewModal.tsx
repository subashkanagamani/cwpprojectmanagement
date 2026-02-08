import { useState, useEffect } from 'react';
import { X, Calendar, User, Building2, Briefcase, TrendingUp, AlertCircle, CheckCircle, Clock, MessageSquare, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import { ReportAttachments } from './ReportAttachments';
import { ReportComments } from './ReportComments';
import { ReportVersionHistory } from './ReportVersionHistory';

interface ReportDetails {
  id: string;
  week_start_date: string;
  work_summary: string;
  status: string;
  key_wins: string;
  challenges: string;
  next_week_plan: string;
  approval_status: string;
  created_at: string;
  clients?: { name: string; industry?: string };
  profiles?: { full_name: string; email: string };
  services?: { name: string };
  service_metrics?: Array<{
    metric_data: any;
  }>;
}

interface ReportViewModalProps {
  reportId: string;
  onClose: () => void;
  canApprove?: boolean;
  onApprove?: () => void;
  onRequestRevision?: () => void;
}

export function ReportViewModal({ reportId, onClose, canApprove = false, onApprove, onRequestRevision }: ReportViewModalProps) {
  const { showToast } = useToast();
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'comments' | 'history'>('details');

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select(`
          *,
          clients(name, industry),
          profiles(full_name, email),
          services(name),
          service_metrics(metric_data)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      on_track: 'bg-green-100 text-green-800',
      needs_attention: 'bg-yellow-100 text-yellow-800',
      delayed: 'bg-red-100 text-red-800',
    };

    const icons: Record<string, JSX.Element> = {
      on_track: <CheckCircle className="h-4 w-4" />,
      needs_attention: <AlertCircle className="h-4 w-4" />,
      delayed: <Clock className="h-4 w-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {icons[status]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getApprovalBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      revision_requested: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">Weekly Report Details</h2>
                {getApprovalBadge(report.approval_status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{report.clients?.name}</span>
                  {report.clients?.industry && (
                    <span className="text-gray-400">• {report.clients.industry}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="h-4 w-4" />
                  <span>{report.services?.name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{report.profiles?.full_name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Week of {format(new Date(report.week_start_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="border-b">
          <div className="flex gap-1 px-6">
            {[
              { id: 'details', label: 'Report Details', icon: FileText },
              { id: 'attachments', label: 'Attachments', icon: TrendingUp },
              { id: 'comments', label: 'Comments', icon: MessageSquare },
              { id: 'history', label: 'Version History', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {getStatusBadge(report.status)}
              </div>

              {report.service_metrics && report.service_metrics.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(report.service_metrics[0].metric_data || {}).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">{key.replace(/_/g, ' ')}</p>
                        <p className="text-2xl font-bold text-gray-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Work Summary</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{report.work_summary || 'No summary provided'}</p>
                </div>

                {report.key_wins && (
                  <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Key Wins
                    </h3>
                    <p className="text-green-800 whitespace-pre-wrap">{report.key_wins}</p>
                  </div>
                )}

                {report.challenges && (
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Challenges
                    </h3>
                    <p className="text-yellow-800 whitespace-pre-wrap">{report.challenges}</p>
                  </div>
                )}

                {report.next_week_plan && (
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Next Week's Plan
                    </h3>
                    <p className="text-blue-800 whitespace-pre-wrap">{report.next_week_plan}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <ReportAttachments reportId={reportId} canUpload={false} canDelete={false} />
          )}

          {activeTab === 'comments' && (
            <ReportComments reportId={reportId} />
          )}

          {activeTab === 'history' && (
            <ReportVersionHistory reportId={reportId} />
          )}
        </div>

        {canApprove && report.approval_status === 'submitted' && (
          <div className="border-t p-6 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-white transition font-medium"
            >
              Close
            </button>
            <button
              onClick={onRequestRevision}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Request Revision
            </button>
            <button
              onClick={onApprove}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Report
            </button>
          </div>
        )}

        {!canApprove && (
          <div className="border-t p-6 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
