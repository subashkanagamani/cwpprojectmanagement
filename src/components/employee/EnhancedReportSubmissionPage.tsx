import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment, WeeklyReport, ActivityMetrics } from '../../lib/database.types';
import { CheckCircle, ArrowLeft, Save, Clock, FileText, Plus, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { ReportAttachments } from '../ReportAttachments';

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
          <h3 className="font-semibold text-gray-900 mb-4">LinkedIn Outreach Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connections Sent
              </label>
              <input
                type="number"
                value={formData.connections_sent}
                onChange={(e) =>
                  setFormData({ ...formData, connections_sent: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connections Accepted
              </label>
              <input
                type="number"
                value={formData.connections_accepted}
                onChange={(e) =>
                  setFormData({ ...formData, connections_accepted: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responses Received
              </label>
              <input
                type="number"
                value={formData.responses_received}
                onChange={(e) =>
                  setFormData({ ...formData, responses_received: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Positive Responses
              </label>
              <input
                type="number"
                value={formData.positive_responses}
                onChange={(e) =>
                  setFormData({ ...formData, positive_responses: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meetings Booked
              </label>
              <input
                type="number"
                value={formData.meetings_booked}
                onChange={(e) =>
                  setFormData({ ...formData, meetings_booked: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">Meeting Dates</label>
            <button
              type="button"
              onClick={addMeetingDate}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Meeting
            </button>
          </div>

          <div className="space-y-3">
            {meetingDates.map((meeting, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="date"
                    value={meeting.date}
                    onChange={(e) => updateMeetingDate(index, 'date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex-[2]">
                  <input
                    type="text"
                    value={meeting.description}
                    onChange={(e) => updateMeetingDate(index, 'description', e.target.value)}
                    placeholder="Meeting description (e.g., Discovery call with CEO)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMeetingDate(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}

            {meetingDates.length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No meetings added yet</p>
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
        <h3 className="font-semibold text-gray-900 mb-4">Email Outreach Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Emails Sent</label>
            <input
              type="number"
              value={formData.metrics.emails_sent || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, emails_sent: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Emails Opened</label>
            <input
              type="number"
              value={formData.metrics.emails_opened || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, emails_opened: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Click-Through Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.metrics.click_through_rate || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, click_through_rate: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Responses Received</label>
            <input
              type="number"
              value={formData.metrics.responses_received || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, responses_received: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Positive Responses</label>
            <input
              type="number"
              value={formData.metrics.positive_responses || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, positive_responses: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meetings Booked</label>
            <input
              type="number"
              value={formData.metrics.meetings_booked || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, meetings_booked: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMetaAdsMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Meta Ads Metrics (Facebook/Instagram)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ad Spend ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.ad_spend || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ad_spend: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Impressions</label>
            <input
              type="number"
              value={formData.metrics.impressions || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, impressions: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clicks</label>
            <input
              type="number"
              value={formData.metrics.clicks || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, clicks: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CTR (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.ctr || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ctr: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conversions</label>
            <input
              type="number"
              value={formData.metrics.conversions || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, conversions: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cost Per Conversion ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.cost_per_conversion || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, cost_per_conversion: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ROAS (Return on Ad Spend)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.roas || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, roas: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leads Generated</label>
            <input
              type="number"
              value={formData.metrics.leads_generated || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, leads_generated: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGoogleAdsMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Google Ads Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ad Spend ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.ad_spend || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ad_spend: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Impressions</label>
            <input
              type="number"
              value={formData.metrics.impressions || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, impressions: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clicks</label>
            <input
              type="number"
              value={formData.metrics.clicks || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, clicks: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CTR (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.ctr || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, ctr: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avg. CPC ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.avg_cpc || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, avg_cpc: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conversions</label>
            <input
              type="number"
              value={formData.metrics.conversions || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, conversions: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conversion Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.metrics.conversion_rate || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, conversion_rate: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality Score (1-10)</label>
            <input
              type="number"
              value={formData.metrics.quality_score || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, quality_score: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSEOMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">SEO Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Organic Traffic</label>
            <input
              type="number"
              value={formData.metrics.organic_traffic || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, organic_traffic: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keywords Ranking</label>
            <input
              type="number"
              value={formData.metrics.keywords_ranking || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, keywords_ranking: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Top 10 Keywords</label>
            <input
              type="number"
              value={formData.metrics.top_10_keywords || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, top_10_keywords: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backlinks Acquired</label>
            <input
              type="number"
              value={formData.metrics.backlinks_acquired || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, backlinks_acquired: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domain Authority</label>
            <input
              type="number"
              value={formData.metrics.domain_authority || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, domain_authority: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pages Indexed</label>
            <input
              type="number"
              value={formData.metrics.pages_indexed || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, pages_indexed: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avg. Session Duration (seconds)</label>
            <input
              type="number"
              value={formData.metrics.avg_session_duration || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, avg_session_duration: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bounce Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.metrics.bounce_rate || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, bounce_rate: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSocialMediaMetrics = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Social Media Management Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Posts Published</label>
            <input
              type="number"
              value={formData.metrics.posts_published || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, posts_published: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Reach</label>
            <input
              type="number"
              value={formData.metrics.total_reach || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_reach: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Impressions</label>
            <input
              type="number"
              value={formData.metrics.total_impressions || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_impressions: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.metrics.engagement_rate || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, engagement_rate: parseFloat(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Followers</label>
            <input
              type="number"
              value={formData.metrics.new_followers || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, new_followers: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Likes</label>
            <input
              type="number"
              value={formData.metrics.total_likes || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_likes: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Comments</label>
            <input
              type="number"
              value={formData.metrics.total_comments || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_comments: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Shares</label>
            <input
              type="number"
              value={formData.metrics.total_shares || 0}
              onChange={(e) => setFormData({ ...formData, metrics: { ...formData.metrics, total_shares: parseInt(e.target.value) || 0 }})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
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
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          Service-specific metrics form is not yet configured for this service. Please add metrics data in the work summary section above.
        </p>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted</h2>
          <p className="text-gray-600">Your weekly report has been submitted successfully.</p>
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
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Submit Weekly Report</h1>
          <p className="text-gray-600 mt-1">Select a client and service to submit your report</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(groupedAssignments).map((group) => (
            <div
              key={group.client?.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {group.client?.name}
              </h3>
              <div className="space-y-2">
                {group.services.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() => setSelectedAssignment(assignment)}
                    className="w-full text-left px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded-lg transition"
                  >
                    {assignment.service?.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {assignments.length === 0 && (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No assignments yet. Contact your admin.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <button
        onClick={() => {
          setSelectedAssignment(null);
          resetForm();
        }}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to assignments
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedAssignment.client?.name}</h2>
              <p className="text-gray-600 mt-1">{selectedAssignment.service?.name}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Start Date
                </label>
                <input
                  type="date"
                  value={formData.week_start_date}
                  onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Summary</label>
                <textarea
                  value={formData.work_summary}
                  onChange={(e) => setFormData({ ...formData, work_summary: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what you worked on this week..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'on_track' | 'needs_attention' | 'delayed',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="on_track">On Track</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">{renderMetricsFields()}</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Wins</label>
                <textarea
                  value={formData.key_wins}
                  onChange={(e) => setFormData({ ...formData, key_wins: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What went well this week?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Challenges / Blockers
                </label>
                <textarea
                  value={formData.challenges}
                  onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any issues or blockers?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Week Plan</label>
                <textarea
                  value={formData.next_week_plan}
                  onChange={(e) => setFormData({ ...formData, next_week_plan: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What are you planning for next week?"
                />
              </div>

              {draftReportId ? (
                <div className="border-t border-gray-200 pt-6">
                  <ReportAttachments reportId={draftReportId} canUpload={true} canDelete={true} />
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Save as draft first to attach files to this report.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={savingDraft}
                  className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  <Save className="h-4 w-4" />
                  {savingDraft ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Auto-Save Enabled</h3>
                <p className="text-sm text-gray-700">
                  Your progress is automatically saved every 30 seconds.
                </p>
              </div>
            </div>
          </div>

          {lastReport && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Last Report</h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(lastReport.week_start_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Status: </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      lastReport.status === 'on_track'
                        ? 'bg-green-100 text-green-800'
                        : lastReport.status === 'needs_attention'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {lastReport.status}
                  </span>
                </div>
                {lastReport.work_summary && (
                  <div>
                    <span className="font-medium text-gray-700">Summary: </span>
                    <p className="text-gray-600 mt-1 line-clamp-3">{lastReport.work_summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
