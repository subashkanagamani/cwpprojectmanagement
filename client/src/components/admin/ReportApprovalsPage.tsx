import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, MessageSquare, Eye, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { ReportViewModal } from '../ReportViewModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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

  const getStatusBadgeVariant = (status: ReportApproval['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved': return 'default';
      case 'submitted': return 'secondary';
      case 'revision_requested': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: ReportApproval['status']) => {
    switch (status) {
      case 'draft': return <Clock className="h-3.5 w-3.5" />;
      case 'submitted': return <AlertCircle className="h-3.5 w-3.5" />;
      case 'approved': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'revision_requested': return <XCircle className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Report Approvals</h1>
          <p className="text-sm text-muted-foreground">Review and approve submitted weekly reports</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'submitted', 'approved', 'revision_requested'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            data-testid={`button-filter-${status}`}
            className="capitalize"
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="space-y-4 max-h-[700px] overflow-y-auto">
        {approvals.map((approval) => (
          <Card key={approval.id} data-testid={`card-approval-${approval.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Badge variant={getStatusBadgeVariant(approval.status)} data-testid={`badge-status-${approval.id}`}>
                      {getStatusIcon(approval.status)}
                      <span className="ml-1">{approval.status.replace('_', ' ')}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(approval.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {approval.weekly_reports?.clients?.name || 'Unknown Client'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Week of {format(new Date(approval.weekly_reports?.week_start_date || ''), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted by: {approval.weekly_reports?.profiles?.full_name || 'Unknown'}
                  </p>
                  {approval.weekly_reports?.services?.name && (
                    <p className="text-sm text-muted-foreground">
                      Service: {approval.weekly_reports.services.name}
                    </p>
                  )}
                </div>
              </div>

              {approval.weekly_reports?.work_summary && (
                <div className="mb-4 p-4 bg-muted rounded-md">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Work Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {approval.weekly_reports.work_summary.substring(0, 200)}
                    {approval.weekly_reports.work_summary.length > 200 && '...'}
                  </p>
                </div>
              )}

              {approval.feedback && (
                <div className="mb-4 p-4 bg-muted rounded-md border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">Feedback</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{approval.feedback}</p>
                  {approval.approver && (
                    <p className="text-xs text-muted-foreground mt-2">
                      By {approval.approver.full_name} on{' '}
                      {approval.approved_at && format(new Date(approval.approved_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setViewingReportId(approval.report_id)}
                  data-testid={`button-view-report-${approval.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Report
                </Button>

                {approval.status === 'submitted' && (
                  <>
                    <Button
                      onClick={() => openFeedbackModal(approval, 'approve')}
                      data-testid={`button-approve-${approval.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openFeedbackModal(approval, 'revise')}
                      data-testid={`button-revise-${approval.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {approvals.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reports found for this filter</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showFeedbackModal && !!selectedApproval} onOpenChange={(open) => {
        if (!open) {
          setShowFeedbackModal(false);
          setFeedback('');
          setSelectedApproval(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Report' : 'Request Revision'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Optionally provide feedback for the approved report'
                : 'Please provide feedback on what needs to be revised'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="feedback">
              Feedback {actionType === 'revise' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="feedback"
              data-testid="input-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              placeholder={
                actionType === 'approve'
                  ? 'Great work! Everything looks good...'
                  : 'Please revise the following sections...'
              }
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackModal(false);
                setFeedback('');
                setSelectedApproval(null);
              }}
              data-testid="button-cancel-feedback"
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (selectedApproval) {
                  if (actionType === 'approve') {
                    handleApprove(selectedApproval);
                  } else {
                    handleRequestRevision(selectedApproval);
                  }
                }
              }}
              data-testid="button-submit-feedback"
            >
              {actionType === 'approve' ? 'Approve Report' : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
