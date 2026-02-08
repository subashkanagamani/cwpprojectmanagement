import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment, WeeklyReport, ActivityMetrics } from '../../lib/database.types';
import { CheckCircle, ArrowLeft, Save, Clock, FileText, Plus, X, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { ReportAttachments } from '../ReportAttachments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  service?: Service;
}

interface MeetingDate {
  date: string;
  description: string;
}

export function EnhancedReportSubmissionPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastReport, setLastReport] = useState<WeeklyReport | null>(null);
  const [meetingDates, setMeetingDates] = useState<MeetingDate[]>([]);
  const [draftReportId, setDraftReportId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    week_start_date: getWeekStart(new Date()),
    work_summary: '',
    status: 'on_track' as 'on_track' | 'needs_attention' | 'delayed',
    key_wins: '',
    challenges: '',
    next_week_plan: '',
    connections_sent: 0,
    connections_accepted: 0,
    responses_received: 0,
    positive_responses: 0,
    meetings_booked: 0,
    metrics: {} as any,
  });

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAssignment) {
      loadDraft();
      loadPreviousReport();
      const interval = setInterval(() => {
        autoSaveDraft();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedAssignment]);

  function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  const loadAssignments = async () => {
    try {
      const { data: assignmentsData, error } = await supabase
        .from('client_assignments')
        .select(`
          *,
          clients(*),
          services(*)
        `)
        .eq('employee_id', user!.id);

      if (error) throw error;

      if (assignmentsData) {
        const assignmentsWithDetails = assignmentsData.map((assignment: any) => ({
          ...assignment,
          client: assignment.clients,
          service: assignment.services,
        }));
        setAssignments(assignmentsWithDetails);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDraft = async () => {
    if (!selectedAssignment) return;

    try {
      const { data: existingDraft, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('client_id', selectedAssignment.client_id)
        .eq('service_id', selectedAssignment.service_id)
        .eq('is_draft', true)
        .eq('week_start_date', formData.week_start_date)
        .maybeSingle();

      if (error) throw error;

      if (existingDraft) {
        setDraftReportId(existingDraft.id);
        setFormData({
          week_start_date: existingDraft.week_start_date,
          work_summary: existingDraft.work_summary || '',
          status: existingDraft.status || 'on_track',
          key_wins: existingDraft.key_wins || '',
          challenges: existingDraft.challenges || '',
          next_week_plan: existingDraft.next_week_plan || '',
          connections_sent: 0,
          connections_accepted: 0,
          responses_received: 0,
          positive_responses: 0,
          meetings_booked: 0,
          metrics: {},
        });
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const loadDraftOld = async () => {
    if (!selectedAssignment) return;

    try {
      const { data, error } = await supabase
        .from('report_drafts')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('client_id', selectedAssignment.client_id)
        .eq('service_id', selectedAssignment.service_id)
        .eq('week_start_date', formData.week_start_date)
        .maybeSingle();

      if (data && !error) {
        const draftData = data.draft_data as any;
        setFormData({
          ...formData,
          ...draftData,
        });
        if (draftData.meetingDates) {
          setMeetingDates(draftData.meetingDates);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const loadPreviousReport = async () => {
    if (!selectedAssignment) return;

    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('client_id', selectedAssignment.client_id)
        .eq('service_id', selectedAssignment.service_id)
        .eq('employee_id', user!.id)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setLastReport(data);
      }
    } catch (error) {
      console.error('Error loading previous report:', error);
    }
  };

  const autoSaveDraft = useCallback(async () => {
    if (!selectedAssignment) return;

    try {
      if (draftReportId) {
        await supabase
          .from('weekly_reports')
          .update({
            work_summary: formData.work_summary,
            status: formData.status,
            key_wins: formData.key_wins,
            challenges: formData.challenges,
            next_week_plan: formData.next_week_plan,
          })
          .eq('id', draftReportId);
      } else {
        const { data, error } = await supabase
          .from('weekly_reports')
          .insert({
            client_id: selectedAssignment.client_id,
            employee_id: user!.id,
            service_id: selectedAssignment.service_id,
            week_start_date: formData.week_start_date,
            work_summary: formData.work_summary,
            status: formData.status,
            key_wins: formData.key_wins,
            challenges: formData.challenges,
            next_week_plan: formData.next_week_plan,
            is_draft: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setDraftReportId(data.id);
      }
    } catch (error) {
      console.error('Error auto-saving draft:', error);
    }
  }, [selectedAssignment, formData, user, draftReportId]);

  const autoSaveDraftOld = useCallback(async () => {
    if (!selectedAssignment) return;

    try {
      const draftData = {
        ...formData,
        meetingDates,
      };

      await supabase
        .from('report_drafts')
        .upsert({
          employee_id: user!.id,
          client_id: selectedAssignment.client_id,
          service_id: selectedAssignment.service_id,
          week_start_date: formData.week_start_date,
          draft_data: draftData,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error auto-saving draft:', error);
    }
  }, [selectedAssignment, formData, meetingDates, user]);

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      await autoSaveDraft();
      showToast('Draft saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save draft', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const addMeetingDate = () => {
    setMeetingDates([...meetingDates, { date: '', description: '' }]);
  };

  const removeMeetingDate = (index: number) => {
    setMeetingDates(meetingDates.filter((_, i) => i !== index));
  };

  const updateMeetingDate = (index: number, field: 'date' | 'description', value: string) => {
    const updated = [...meetingDates];
    updated[index][field] = value;
    setMeetingDates(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setSubmitting(true);

    try {
      let reportData;
      let reportError;

      if (draftReportId) {
        const result = await supabase
          .from('weekly_reports')
          .update({
            work_summary: formData.work_summary,
            status: formData.status,
            key_wins: formData.key_wins,
            challenges: formData.challenges,
            next_week_plan: formData.next_week_plan,
            is_draft: false,
            approval_status: 'submitted',
          })
          .eq('id', draftReportId)
          .select()
          .single();

        reportData = result.data;
        reportError = result.error;
      } else {
        const result = await supabase
          .from('weekly_reports')
          .insert({
            client_id: selectedAssignment.client_id,
            employee_id: user!.id,
            service_id: selectedAssignment.service_id,
            week_start_date: formData.week_start_date,
            work_summary: formData.work_summary,
            status: formData.status,
            key_wins: formData.key_wins,
            challenges: formData.challenges,
            next_week_plan: formData.next_week_plan,
            is_draft: false,
            approval_status: 'submitted',
          })
          .select()
          .single();

        reportData = result.data;
        reportError = result.error;
      }

      if (reportError) throw reportError;

      if (reportData) {
        if (selectedAssignment.service?.slug === 'linkedin_outreach') {
          await supabase.from('activity_metrics').insert({
            report_id: reportData.id,
            metric_type: 'linkedin_outreach',
            connections_sent: formData.connections_sent,
            connections_accepted: formData.connections_accepted,
            responses_received: formData.responses_received,
            positive_responses: formData.positive_responses,
            meetings_booked: formData.meetings_booked,
            meeting_dates: meetingDates,
          });
        } else {
          await supabase.from('service_metrics').insert({
            weekly_report_id: reportData.id,
            metric_data: formData.metrics,
          });
        }

        await supabase
          .from('report_drafts')
          .delete()
          .eq('employee_id', user!.id)
          .eq('client_id', selectedAssignment.client_id)
          .eq('service_id', selectedAssignment.service_id)
          .eq('week_start_date', formData.week_start_date);

        await supabase.from('notifications').insert({
          user_id: user!.id,
          title: 'Report Submitted',
          message: `Your weekly report for ${selectedAssignment.client?.name} has been submitted successfully.`,
          type: 'success',
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSelectedAssignment(null);
        setSuccess(false);
        resetForm();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      if (error.code === '23505') {
        showToast('You have already submitted a report for this client, service, and week.', 'error');
      } else {
        showToast('Failed to submit report. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      week_start_date: getWeekStart(new Date()),
      work_summary: '',
      status: 'on_track',
      key_wins: '',
      challenges: '',
      next_week_plan: '',
      connections_sent: 0,
      connections_accepted: 0,
      responses_received: 0,
      positive_responses: 0,
      meetings_booked: 0,
      metrics: {},
    });
    setMeetingDates([]);
  };

  const renderLinkedInMetrics = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-4">LinkedIn Outreach Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Connections Sent</Label>
              <Input
                type="number"
                value={formData.connections_sent}
                onChange={(e) =>
                  setFormData({ ...formData, connections_sent: parseInt(e.target.value) || 0 })
                }
                required
                data-testid="input-connections-sent"
              />
            </div>
            <div>
              <Label>Connections Accepted</Label>
              <Input
                type="number"
                value={formData.connections_accepted}
                onChange={(e) =>
                  setFormData({ ...formData, connections_accepted: parseInt(e.target.value) || 0 })
                }
                required
                data-testid="input-connections-accepted"
              />
            </div>
            <div>
              <Label>Responses Received</Label>
              <Input
                type="number"
                value={formData.responses_received}
                onChange={(e) =>
                  setFormData({ ...formData, responses_received: parseInt(e.target.value) || 0 })
                }
                required
                data-testid="input-responses-received"
              />
            </div>
            <div>
              <Label>Positive Responses</Label>
              <Input
                type="number"
                value={formData.positive_responses}
                onChange={(e) =>
                  setFormData({ ...formData, positive_responses: parseInt(e.target.value) || 0 })
                }
                required
                data-testid="input-positive-responses"
              />
            </div>
            <div className="col-span-2">
              <Label>Meetings Booked</Label>
              <Input
                type="number"
                value={formData.meetings_booked}
                onChange={(e) =>
                  setFormData({ ...formData, meetings_booked: parseInt(e.target.value) || 0 })
                }
                required
                data-testid="input-meetings-booked"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center gap-4 flex-wrap mb-3">
            <Label>Meeting Dates</Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={addMeetingDate}
              data-testid="button-add-meeting"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Meeting
            </Button>
          </div>

          <div className="space-y-3">
            {meetingDates.map((meeting, index) => (
              <div key={index} className="flex gap-3 items-start flex-wrap">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={meeting.date}
                    onChange={(e) => updateMeetingDate(index, 'date', e.target.value)}
                    required
                    data-testid={`input-meeting-date-${index}`}
                  />
                </div>
                <div className="flex-[2]">
                  <Input
                    type="text"
                    value={meeting.description}
                    onChange={(e) => updateMeetingDate(index, 'description', e.target.value)}
                    placeholder="Meeting description (e.g., Discovery call with CEO)"
                    data-testid={`input-meeting-desc-${index}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMeetingDate(index)}
                  className="text-destructive"
                  data-testid={`button-remove-meeting-${index}`}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ))}

            {meetingDates.length === 0 && (
              <div className="text-center py-6 bg-muted rounded-md border-2 border-dashed border-border">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No meetings added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmailOutreachMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Email Outreach Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Emails Sent</Label>
            <Input
              type="number"
              value={formData.metrics.emails_sent || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, emails_sent: parseInt(e.target.value) || 0 }})}
              min="0"
              data-testid="input-emails-sent"
            />
          </div>
          <div>
            <Label>Emails Opened</Label>
            <Input
              type="number"
              value={formData.metrics.emails_opened || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, emails_opened: parseInt(e.target.value) || 0 }})}
              min="0"
              data-testid="input-emails-opened"
            />
          </div>
          <div>
            <Label>Click-Through Rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.metrics.click_through_rate || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, click_through_rate: parseFloat(e.target.value) || 0 }})}
              min="0"
              max="100"
              data-testid="input-click-through-rate"
            />
          </div>
          <div>
            <Label>Responses Received</Label>
            <Input
              type="number"
              value={formData.metrics.responses_received || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, responses_received: parseInt(e.target.value) || 0 }})}
              min="0"
              data-testid="input-email-responses"
            />
          </div>
          <div>
            <Label>Positive Responses</Label>
            <Input
              type="number"
              value={formData.metrics.positive_responses || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, positive_responses: parseInt(e.target.value) || 0 }})}
              min="0"
              data-testid="input-email-positive-responses"
            />
          </div>
          <div>
            <Label>Meetings Booked</Label>
            <Input
              type="number"
              value={formData.metrics.meetings_booked || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, meetings_booked: parseInt(e.target.value) || 0 }})}
              min="0"
              data-testid="input-email-meetings-booked"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMetaAdsMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Meta Ads Metrics (Facebook/Instagram)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Ad Spend ($)</Label>
            <Input type="number" step="0.01" value={formData.metrics.ad_spend || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ad_spend: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-meta-ad-spend" />
          </div>
          <div>
            <Label>Impressions</Label>
            <Input type="number" value={formData.metrics.impressions || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, impressions: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-meta-impressions" />
          </div>
          <div>
            <Label>Clicks</Label>
            <Input type="number" value={formData.metrics.clicks || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, clicks: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-meta-clicks" />
          </div>
          <div>
            <Label>CTR (%)</Label>
            <Input type="number" step="0.01" value={formData.metrics.ctr || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ctr: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-meta-ctr" />
          </div>
          <div>
            <Label>Conversions</Label>
            <Input type="number" value={formData.metrics.conversions || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, conversions: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-meta-conversions" />
          </div>
          <div>
            <Label>Cost Per Conversion ($)</Label>
            <Input type="number" step="0.01" value={formData.metrics.cost_per_conversion || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, cost_per_conversion: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-meta-cost-per-conv" />
          </div>
          <div>
            <Label>ROAS (Return on Ad Spend)</Label>
            <Input type="number" step="0.01" value={formData.metrics.roas || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, roas: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-meta-roas" />
          </div>
          <div>
            <Label>Leads Generated</Label>
            <Input type="number" value={formData.metrics.leads_generated || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, leads_generated: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-meta-leads" />
          </div>
        </div>
      </div>
    );
  };

  const renderGoogleAdsMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Google Ads Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Ad Spend ($)</Label>
            <Input type="number" step="0.01" value={formData.metrics.ad_spend || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ad_spend: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-google-ad-spend" />
          </div>
          <div>
            <Label>Impressions</Label>
            <Input type="number" value={formData.metrics.impressions || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, impressions: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-google-impressions" />
          </div>
          <div>
            <Label>Clicks</Label>
            <Input type="number" value={formData.metrics.clicks || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, clicks: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-google-clicks" />
          </div>
          <div>
            <Label>CTR (%)</Label>
            <Input type="number" step="0.01" value={formData.metrics.ctr || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ctr: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-google-ctr" />
          </div>
          <div>
            <Label>Avg. CPC ($)</Label>
            <Input type="number" step="0.01" value={formData.metrics.avg_cpc || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, avg_cpc: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-google-avg-cpc" />
          </div>
          <div>
            <Label>Conversions</Label>
            <Input type="number" value={formData.metrics.conversions || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, conversions: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-google-conversions" />
          </div>
          <div>
            <Label>Conversion Rate (%)</Label>
            <Input type="number" step="0.01" value={formData.metrics.conversion_rate || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, conversion_rate: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-google-conv-rate" />
          </div>
          <div>
            <Label>Quality Score (1-10)</Label>
            <Input type="number" value={formData.metrics.quality_score || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, quality_score: parseInt(e.target.value) || 0 }})} min="1" max="10" data-testid="input-google-quality-score" />
          </div>
        </div>
      </div>
    );
  };

  const renderSEOMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">SEO Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Organic Traffic</Label>
            <Input type="number" value={formData.metrics.organic_traffic || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, organic_traffic: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-seo-organic-traffic" />
          </div>
          <div>
            <Label>Keywords Ranking</Label>
            <Input type="number" value={formData.metrics.keywords_ranking || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, keywords_ranking: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-seo-keywords" />
          </div>
          <div>
            <Label>Top 10 Keywords</Label>
            <Input type="number" value={formData.metrics.top_10_keywords || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, top_10_keywords: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-seo-top10" />
          </div>
          <div>
            <Label>Backlinks Acquired</Label>
            <Input type="number" value={formData.metrics.backlinks_acquired || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, backlinks_acquired: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-seo-backlinks" />
          </div>
          <div>
            <Label>Domain Authority</Label>
            <Input type="number" value={formData.metrics.domain_authority || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, domain_authority: parseInt(e.target.value) || 0 }})} min="0" max="100" data-testid="input-seo-domain-auth" />
          </div>
          <div>
            <Label>Pages Indexed</Label>
            <Input type="number" value={formData.metrics.pages_indexed || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, pages_indexed: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-seo-pages-indexed" />
          </div>
          <div>
            <Label>Avg. Session Duration (seconds)</Label>
            <Input type="number" value={formData.metrics.avg_session_duration || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, avg_session_duration: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-seo-session-duration" />
          </div>
          <div>
            <Label>Bounce Rate (%)</Label>
            <Input type="number" step="0.1" value={formData.metrics.bounce_rate || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, bounce_rate: parseFloat(e.target.value) || 0 }})} min="0" max="100" data-testid="input-seo-bounce-rate" />
          </div>
        </div>
      </div>
    );
  };

  const renderSocialMediaMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Social Media Management Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Posts Published</Label>
            <Input type="number" value={formData.metrics.posts_published || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, posts_published: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-posts" />
          </div>
          <div>
            <Label>Total Reach</Label>
            <Input type="number" value={formData.metrics.total_reach || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_reach: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-reach" />
          </div>
          <div>
            <Label>Total Impressions</Label>
            <Input type="number" value={formData.metrics.total_impressions || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_impressions: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-impressions" />
          </div>
          <div>
            <Label>Engagement Rate (%)</Label>
            <Input type="number" step="0.1" value={formData.metrics.engagement_rate || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, engagement_rate: parseFloat(e.target.value) || 0 }})} min="0" data-testid="input-social-engagement" />
          </div>
          <div>
            <Label>New Followers</Label>
            <Input type="number" value={formData.metrics.new_followers || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, new_followers: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-followers" />
          </div>
          <div>
            <Label>Total Likes</Label>
            <Input type="number" value={formData.metrics.total_likes || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_likes: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-likes" />
          </div>
          <div>
            <Label>Total Comments</Label>
            <Input type="number" value={formData.metrics.total_comments || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_comments: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-comments" />
          </div>
          <div>
            <Label>Total Shares</Label>
            <Input type="number" value={formData.metrics.total_shares || 0} onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_shares: parseInt(e.target.value) || 0 }})} min="0" data-testid="input-social-shares" />
          </div>
        </div>
      </div>
    );
  };

  const renderMetricsFields = () => {
    if (!selectedAssignment?.service) return null;

    const slug = selectedAssignment.service.slug;

    if (slug === 'linkedin_outreach') {
      return renderLinkedInMetrics();
    } else if (slug === 'email_outreach') {
      return renderEmailOutreachMetrics();
    } else if (slug === 'meta_ads' || slug === 'facebook_ads' || slug === 'instagram_ads') {
      return renderMetaAdsMetrics();
    } else if (slug === 'google_ads') {
      return renderGoogleAdsMetrics();
    } else if (slug === 'seo') {
      return renderSEOMetrics();
    } else if (slug === 'social_media' || slug === 'social_media_management') {
      return renderSocialMediaMetrics();
    }

    return (
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-6">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Service-specific metrics form is not yet configured for this service. Please add metrics data in the work summary section above.
          </p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Report Submitted</h2>
          <p className="text-muted-foreground">Your weekly report has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  if (!selectedAssignment) {
    const groupedAssignments = assignments.reduce((acc, assignment) => {
      const clientId = assignment.client_id;
      if (!acc[clientId]) {
        acc[clientId] = {
          client: assignment.client,
          services: [],
        };
      }
      acc[clientId].services.push(assignment);
      return acc;
    }, {} as Record<string, { client: Client | undefined; services: AssignmentWithDetails[] }>);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Submit Weekly Report</h1>
            <p className="text-sm text-muted-foreground">Select a client and service to submit your report</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(groupedAssignments).map((group) => (
            <Card
              key={group.client?.id}
              className="hover-elevate"
              data-testid={`assignment-card-${group.client?.id}`}
            >
              <CardHeader>
                <CardTitle>{group.client?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.services.map((assignment) => (
                    <Button
                      key={assignment.id}
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => setSelectedAssignment(assignment)}
                      data-testid={`button-select-assignment-${assignment.id}`}
                    >
                      {assignment.service?.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {assignments.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No assignments yet. Contact your admin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Button
        variant="ghost"
        onClick={() => {
          setSelectedAssignment(null);
          resetForm();
        }}
        data-testid="button-back-to-assignments"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to assignments
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{selectedAssignment.client?.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedAssignment.service?.name}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>Week Start Date</Label>
                  <Input
                    type="date"
                    value={formData.week_start_date}
                    onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                    required
                    data-testid="input-week-start-date"
                  />
                </div>

                <div>
                  <Label>Work Summary</Label>
                  <Textarea
                    value={formData.work_summary}
                    onChange={(e) => setFormData({ ...formData, work_summary: e.target.value })}
                    rows={4}
                    placeholder="Describe what you worked on this week..."
                    required
                    data-testid="textarea-work-summary"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as 'on_track' | 'needs_attention' | 'delayed',
                      })
                    }
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted rounded-md p-6">{renderMetricsFields()}</div>

                <div>
                  <Label>Key Wins</Label>
                  <Textarea
                    value={formData.key_wins}
                    onChange={(e) => setFormData({ ...formData, key_wins: e.target.value })}
                    rows={3}
                    placeholder="What went well this week?"
                    data-testid="textarea-key-wins"
                  />
                </div>

                <div>
                  <Label>Challenges / Blockers</Label>
                  <Textarea
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    rows={3}
                    placeholder="Any issues or blockers?"
                    data-testid="textarea-challenges"
                  />
                </div>

                <div>
                  <Label>Next Week Plan</Label>
                  <Textarea
                    value={formData.next_week_plan}
                    onChange={(e) => setFormData({ ...formData, next_week_plan: e.target.value })}
                    rows={3}
                    placeholder="What are you planning for next week?"
                    data-testid="textarea-next-week-plan"
                  />
                </div>

                {draftReportId ? (
                  <div className="border-t border-border pt-6">
                    <ReportAttachments reportId={draftReportId} canUpload={true} canDelete={true} />
                  </div>
                ) : (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Save as draft first to attach files to this report.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-3 flex-wrap pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={saveDraft}
                    disabled={savingDraft}
                    data-testid="button-save-draft"
                  >
                    {savingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    data-testid="button-submit-report"
                  >
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Auto-Save Enabled</h3>
                  <p className="text-sm text-muted-foreground">
                    Your progress is automatically saved every 30 seconds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {lastReport && (
            <Card data-testid="card-last-report">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <CardTitle className="text-base">Last Report</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lastReport.week_start_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">Status: </span>
                    <Badge
                      variant={
                        lastReport.status === 'on_track'
                          ? 'default'
                          : lastReport.status === 'needs_attention'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {lastReport.status}
                    </Badge>
                  </div>
                  {lastReport.work_summary && (
                    <div>
                      <span className="font-medium text-muted-foreground">Summary: </span>
                      <p className="text-muted-foreground mt-1 line-clamp-3">{lastReport.work_summary}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
