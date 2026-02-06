import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, MessageSquare, Eye, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { ReportViewModal } from '../ReportViewModal';

interface ReportApproval {
  id: string;
  report_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested';
  approver_id: string | null;
  approved_at: string | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  weekly_reports?: {
    id: string;
    week_start_date: string;
    work_summary: string;
    clients?: { name: string };
    profiles?: { full_name: string };
    services?: { name: string };
  };
  approver?: {
    full_name: string;
  };
}

export function ReportApprovalsPage() {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState<ReportApproval[]>([]);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'revision_requested'>('submitted');
  const [selectedApproval, setSelectedApproval] = useState<ReportApproval | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'revise'>('approve');
  const [loading, setLoading] = useState(true);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  const loadApprovals = async () => {
    try {
      let query = supabase
        .from('report_approvals')
        .select(`
          *,
          weekly_reports(
            id,
            week_start_date,
            work_summary,
            clients(name),
            profiles(full_name),
            services(name)
          ),
          approver:profiles!report_approvals_approver_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
      showToast('Failed to load approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: ReportApproval) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('report_approvals')
        .update({
          status: 'approved',
          approver_id: user.id,
          approved_at: new Date().toISOString(),
          feedback,
        })
        .eq('id', approval.id);

      if (error) throw error;

      await supabase
        .from('weekly_reports')
        .update({ approval_status: 'approved' })
        .eq('id', approval.report_id);

      showToast('Report approved successfully', 'success');
      setShowFeedbackModal(false);
      setFeedback('');
      setSelectedApproval(null);
      loadApprovals();
    } catch (error) {
      console.error('Error approving report:', error);
      showToast('Failed to approve report', 'error');
    }
  };

  const handleRequestRevision = async (approval: ReportApproval) => {
    if (!feedback.trim()) {
      showToast('Please provide feedback for revision', 'error');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('report_approvals')
        .update({
          status: 'revision_requested',
          approver_id: user.id,
          feedback,
        })
        .eq('id', approval.id);

      if (error) throw error;

      await supabase
        .from('weekly_reports')
        .update({ approval_status: 'revision_requested' })
        .eq('id', approval.report_id);

      showToast('Revision requested successfully', 'success');
      setShowFeedbackModal(false);
      setFeedback('');
      setSelectedApproval(null);
      loadApprovals();
    } catch (error) {
      console.error('Error requesting revision:', error);
      showToast('Failed to request revision', 'error');
    }
  };

  const openFeedbackModal = (approval: ReportApproval, type: 'approve' | 'revise') => {
    setSelectedApproval(approval);
    setActionType(type);
    setShowFeedbackModal(true);
    setFeedback('');
  };

  const getStatusBadge = (status: ReportApproval['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      revision_requested: 'bg-red-100 text-red-800',
    };

    const icons = {
      draft: <Clock className="h-4 w-4" />,
      submitted: <AlertCircle className="h-4 w-4" />,
      approved: <CheckCircle className="h-4 w-4" />,
      revision_requested: <XCircle className="h-4 w-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {icons[status]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Approvals</h1>
          <p className="text-gray-600 mt-1">Review and approve submitted weekly reports</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'submitted', 'approved', 'revision_requested'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4 max-h-[700px] overflow-y-auto">
        {approvals.map((approval) => (
          <div key={approval.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusBadge(approval.status)}
                  <span className="text-sm text-gray-500">
                    {format(new Date(approval.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {approval.weekly_reports?.clients?.name || 'Unknown Client'}
                </h3>
                <p className="text-sm text-gray-600">
                  Week of {format(new Date(approval.weekly_reports?.week_start_date || ''), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  Submitted by: {approval.weekly_reports?.profiles?.full_name || 'Unknown'}
                </p>
                {approval.weekly_reports?.services?.name && (
                  <p className="text-sm text-gray-600">
                    Service: {approval.weekly_reports.services.name}
                  </p>
                )}
              </div>
            </div>

            {approval.weekly_reports?.work_summary && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Work Summary</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {approval.weekly_reports.work_summary.substring(0, 200)}
                  {approval.weekly_reports.work_summary.length > 200 && '...'}
                </p>
              </div>
            )}

            {approval.feedback && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-900">Feedback</h4>
                </div>
                <p className="text-sm text-blue-800">{approval.feedback}</p>
                {approval.approver && (
                  <p className="text-xs text-blue-600 mt-2">
                    By {approval.approver.full_name} on{' '}
                    {approval.approved_at && format(new Date(approval.approved_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setViewingReportId(approval.report_id)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <Eye className="h-4 w-4" />
                View Full Report
              </button>

              {approval.status === 'submitted' && (
                <>
                  <button
                    onClick={() => openFeedbackModal(approval, 'approve')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => openFeedbackModal(approval, 'revise')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    Request Revision
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {approvals.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No reports found for this filter</p>
          </div>
        )}
      </div>

      {showFeedbackModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {actionType === 'approve' ? 'Approve Report' : 'Request Revision'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {actionType === 'approve'
                  ? 'Optionally provide feedback for the approved report'
                  : 'Please provide feedback on what needs to be revised'}
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback {actionType === 'revise' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg resize-none"
                rows={6}
                placeholder={
                  actionType === 'approve'
                    ? 'Great work! Everything looks good...'
                    : 'Please revise the following sections...'
                }
              />
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedback('');
                  setSelectedApproval(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionType === 'approve') {
                    handleApprove(selectedApproval);
                  } else {
                    handleRequestRevision(selectedApproval);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-white transition ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionType === 'approve' ? 'Approve Report' : 'Request Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingReportId && (
        <ReportViewModal
          reportId={viewingReportId}
          onClose={() => setViewingReportId(null)}
          canApprove={true}
          onApprove={() => {
            const approval = approvals.find(a => a.report_id === viewingReportId);
            if (approval) {
              openFeedbackModal(approval, 'approve');
              setViewingReportId(null);
            }
          }}
          onRequestRevision={() => {
            const approval = approvals.find(a => a.report_id === viewingReportId);
            if (approval) {
              openFeedbackModal(approval, 'revise');
              setViewingReportId(null);
            }
          }}
        />
      )}
    </div>
  );
}
