import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment } from '../../lib/database.types';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

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
        const assignmentsWithDetails = await Promise.all(
          assignmentsData.map(async (assignment) => {
            const [clientRes, serviceRes] = await Promise.all([
              supabase.from('clients').select('*').eq('id', assignment.client_id).single(),
              supabase.from('services').select('*').eq('id', assignment.service_id).single(),
            ]);

            return {
              ...assignment,
              client: clientRes.data || undefined,
              service: serviceRes.data || undefined,
            };
          })
        );
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
        const { error: metricsError } = await supabase.from('service_metrics').insert({
          weekly_report_id: reportData.id,
          metric_data: formData.metrics,
        });

        if (metricsError) throw metricsError;
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
            <h3 className="font-semibold text-gray-900 mb-3">Email Outreach Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emails Sent
                </label>
                <input
                  type="number"
                  value={formData.metrics.emails_sent || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, emails_sent: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Replies</label>
                <input
                  type="number"
                  value={formData.metrics.replies || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, replies: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Positive Replies
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meetings Booked
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'linkedin_outreach':
        return (
          <>
            <h3 className="font-semibold text-gray-900 mb-3">LinkedIn Outreach Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Requests Sent
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accepted</label>
                <input
                  type="number"
                  value={formData.metrics.accepted || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, accepted: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Replies</label>
                <input
                  type="number"
                  value={formData.metrics.replies || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, replies: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meetings Booked
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <h3 className="font-semibold text-gray-900 mb-3">
              {selectedAssignment.service.name} Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spend</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.metrics.spend || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, spend: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impressions
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clicks</label>
                <input
                  type="number"
                  value={formData.metrics.clicks || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, clicks: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leads</label>
                <input
                  type="number"
                  value={formData.metrics.leads || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, leads: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Per Lead
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.metrics.cpl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, cpl: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'seo':
        return (
          <>
            <h3 className="font-semibold text-gray-900 mb-3">SEO Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords Worked On
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ranking Improvements
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Traffic Change (%)
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pages Optimized
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backlinks Built
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </>
        );

      case 'social_media':
        return (
          <>
            <h3 className="font-semibold text-gray-900 mb-3">Social Media Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Published
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reach</label>
                <input
                  type="number"
                  value={formData.metrics.reach || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, reach: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Engagement</label>
                <input
                  type="number"
                  value={formData.metrics.engagement || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metrics: { ...formData.metrics, engagement: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follower Growth
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-4xl">
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

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setSelectedAssignment(null);
                resetForm();
              }}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
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
  );
}
