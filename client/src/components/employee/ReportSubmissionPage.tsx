import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment } from '../../lib/database.types';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  service?: Service;
}

export function ReportSubmissionPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    week_start_date: getWeekStart(new Date()),
    work_summary: '',
    status: 'on_track' as 'on_track' | 'needs_attention' | 'delayed',
    key_wins: '',
    challenges: '',
    next_week_plan: '',
    metrics: {} as any,
  });

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

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
        .select('*')
        .eq('employee_id', user!.id);

      if (error) throw error;

      if (assignmentsData) {
        const { data: assignmentsWithRelations } = await supabase
          .from('client_assignments')
          .select('*, clients(*), services(*)')
          .eq('employee_id', user!.id);

        const assignmentsWithDetails = (assignmentsWithRelations || []).map((assignment: any) => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setSubmitting(true);

    try {
      const { data: reportData, error: reportError } = await supabase
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
        })
        .select()
        .single();

      if (reportError) throw reportError;

      if (reportData) {
        const { data: existingMetrics } = await supabase
          .from('service_metrics')
          .select('id')
          .eq('weekly_report_id', reportData.id)
          .maybeSingle();

        if (existingMetrics) {
          const { error: metricsError } = await supabase
            .from('service_metrics')
            .update({ metric_data: formData.metrics, updated_at: new Date().toISOString() })
            .eq('id', existingMetrics.id);

          if (metricsError) throw metricsError;
        } else {
          const { error: metricsError } = await supabase
            .from('service_metrics')
            .insert({
              weekly_report_id: reportData.id,
              metric_data: formData.metrics,
            });

          if (metricsError) throw metricsError;
        }
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
      metrics: {},
    });
  };

  const renderMetricsFields = () => {
    if (!selectedAssignment?.service) return null;

    const slug = selectedAssignment.service.slug;

    switch (slug) {
      case 'email_outreach':
        return (
          <>
            <h3 className="font-semibold text-foreground mb-3">Email Outreach Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Emails Sent</Label>
                <Input
                  type="number"
                  value={formData.metrics.emails_sent || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, emails_sent: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-emails-sent"
                  required
                />
              </div>
              <div>
                <Label>Replies</Label>
                <Input
                  type="number"
                  value={formData.metrics.replies || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, replies: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-email-replies"
                  required
                />
              </div>
              <div>
                <Label>Positive Replies</Label>
                <Input
                  type="number"
                  value={formData.metrics.positive_replies || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        positive_replies: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-positive-replies"
                  required
                />
              </div>
              <div>
                <Label>Meetings Booked</Label>
                <Input
                  type="number"
                  value={formData.metrics.meetings_booked || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        meetings_booked: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-email-meetings-booked"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'linkedin_outreach':
        return (
          <>
            <h3 className="font-semibold text-foreground mb-3">LinkedIn Outreach Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Connection Requests Sent</Label>
                <Input
                  type="number"
                  value={formData.metrics.connection_requests_sent || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        connection_requests_sent: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-connection-requests"
                  required
                />
              </div>
              <div>
                <Label>Accepted</Label>
                <Input
                  type="number"
                  value={formData.metrics.accepted || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, accepted: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-accepted"
                  required
                />
              </div>
              <div>
                <Label>Replies</Label>
                <Input
                  type="number"
                  value={formData.metrics.replies || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, replies: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-linkedin-replies"
                  required
                />
              </div>
              <div>
                <Label>Meetings Booked</Label>
                <Input
                  type="number"
                  value={formData.metrics.meetings_booked || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        meetings_booked: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-linkedin-meetings-booked"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'meta_ads':
      case 'google_ads':
        return (
          <>
            <h3 className="font-semibold text-foreground mb-3">
              {selectedAssignment.service.name} Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Spend</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.metrics.spend || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, spend: parseFloat(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-spend"
                  required
                />
              </div>
              <div>
                <Label>Impressions</Label>
                <Input
                  type="number"
                  value={formData.metrics.impressions || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        impressions: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-impressions"
                  required
                />
              </div>
              <div>
                <Label>Clicks</Label>
                <Input
                  type="number"
                  value={formData.metrics.clicks || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, clicks: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-clicks"
                  required
                />
              </div>
              <div>
                <Label>Leads</Label>
                <Input
                  type="number"
                  value={formData.metrics.leads || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, leads: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-leads"
                  required
                />
              </div>
              <div>
                <Label>Cost Per Lead</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.metrics.cpl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, cpl: parseFloat(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-cpl"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'seo':
        return (
          <>
            <h3 className="font-semibold text-foreground mb-3">SEO Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Keywords Worked On</Label>
                <Input
                  type="number"
                  value={formData.metrics.keywords_worked_on || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        keywords_worked_on: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-keywords"
                  required
                />
              </div>
              <div>
                <Label>Ranking Improvements</Label>
                <Input
                  type="number"
                  value={formData.metrics.ranking_improvements || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        ranking_improvements: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-ranking-improvements"
                  required
                />
              </div>
              <div>
                <Label>Traffic Change (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.metrics.traffic_change_percent || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        traffic_change_percent: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-traffic-change"
                  required
                />
              </div>
              <div>
                <Label>Pages Optimized</Label>
                <Input
                  type="number"
                  value={formData.metrics.pages_optimized || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        pages_optimized: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-pages-optimized"
                  required
                />
              </div>
              <div>
                <Label>Backlinks Built</Label>
                <Input
                  type="number"
                  value={formData.metrics.backlinks_built || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        backlinks_built: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-backlinks"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'social_media':
        return (
          <>
            <h3 className="font-semibold text-foreground mb-3">Social Media Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Posts Published</Label>
                <Input
                  type="number"
                  value={formData.metrics.posts_published || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        posts_published: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-posts-published"
                  required
                />
              </div>
              <div>
                <Label>Reach</Label>
                <Input
                  type="number"
                  value={formData.metrics.reach || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, reach: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-reach"
                  required
                />
              </div>
              <div>
                <Label>Engagement</Label>
                <Input
                  type="number"
                  value={formData.metrics.engagement || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, engagement: parseInt(e.target.value) || 0 },
                    })
                  }
                  data-testid="input-engagement"
                  required
                />
              </div>
              <div>
                <Label>Follower Growth</Label>
                <Input
                  type="number"
                  value={formData.metrics.follower_growth || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: {
                        ...formData.metrics,
                        follower_growth: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-follower-growth"
                  required
                />
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2" data-testid="text-report-submitted">Report Submitted</h2>
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
            <Card key={group.client?.id} data-testid={`card-assignment-${group.client?.id}`}>
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-assignment-client-${group.client?.id}`}>
                  {group.client?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.services.map((assignment) => (
                  <Button
                    key={assignment.id}
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => setSelectedAssignment(assignment)}
                    data-testid={`button-select-service-${assignment.id}`}
                  >
                    {assignment.service?.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))}

          {assignments.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground" data-testid="text-no-assignments">No assignments yet. Contact your admin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => {
          setSelectedAssignment(null);
          resetForm();
        }}
        data-testid="button-back-assignments"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to assignments
      </Button>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle data-testid="text-report-client-name">{selectedAssignment.client?.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{selectedAssignment.service?.name}</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="week_start_date">Week Start Date</Label>
              <Input
                id="week_start_date"
                type="date"
                value={formData.week_start_date}
                onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                data-testid="input-week-start-date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_summary">Work Summary</Label>
              <Textarea
                id="work_summary"
                value={formData.work_summary}
                onChange={(e) => setFormData({ ...formData, work_summary: e.target.value })}
                rows={4}
                placeholder="Describe what you worked on this week..."
                data-testid="input-work-summary"
                required
              />
            </div>

            <div className="space-y-2">
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
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="needs_attention">Needs Attention</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted rounded-md p-6">{renderMetricsFields()}</div>

            <div className="space-y-2">
              <Label htmlFor="key_wins">Key Wins</Label>
              <Textarea
                id="key_wins"
                value={formData.key_wins}
                onChange={(e) => setFormData({ ...formData, key_wins: e.target.value })}
                rows={3}
                placeholder="What went well this week?"
                data-testid="input-key-wins"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenges">Challenges / Blockers</Label>
              <Textarea
                id="challenges"
                value={formData.challenges}
                onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                rows={3}
                placeholder="Any issues or blockers?"
                data-testid="input-challenges"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_week_plan">Next Week Plan</Label>
              <Textarea
                id="next_week_plan"
                value={formData.next_week_plan}
                onChange={(e) => setFormData({ ...formData, next_week_plan: e.target.value })}
                rows={3}
                placeholder="What are you planning for next week?"
                data-testid="input-next-week-plan"
              />
            </div>

            <div className="flex justify-end gap-3 flex-wrap pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedAssignment(null);
                  resetForm();
                }}
                data-testid="button-cancel-report"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="button-submit-report"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
