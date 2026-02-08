import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  rating: number;
  feedback: string;
  created_at: string;
  portal_user_id: string;
  client_portal_users: {
    full_name: string;
    email: string;
  };
}

interface ReportFeedbackProps {
  reportId: string;
  isClientPortal?: boolean;
  portalUserId?: string;
}

export default function ReportFeedback({ reportId, isClientPortal, portalUserId }: ReportFeedbackProps) {
  const { showToast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [reportId]);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('report_feedback')
        .select(`
          *,
          client_portal_users:portal_user_id(full_name, email)
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || !portalUserId) {
      showToast('Please provide a rating', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('report_feedback')
        .insert({
          report_id: reportId,
          portal_user_id: portalUserId,
          rating,
          feedback: feedbackText,
        });

      if (error) throw error;

      showToast('Thank you for your feedback!', 'success');
      setRating(0);
      setFeedbackText('');
      setShowForm(false);
      fetchFeedback();
    } catch (error) {
      showToast('Failed to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Client Feedback
          </h3>
          {feedbacks.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {averageRating.toFixed(1)} ({feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>

        {isClientPortal && portalUserId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <ThumbsUp className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Leave Feedback'}
          </button>
        )}
      </div>

      {showForm && isClientPortal && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate this report
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Additional comments (optional)
            </label>
            <textarea
              id="feedback"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              placeholder="Share your thoughts about this report..."
            />
          </div>

          <button
            type="submit"
            disabled={!rating || submitting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {feedbacks.map((feedback) => (
          <div key={feedback.id} className="border-l-4 border-blue-200 pl-4 py-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= feedback.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {feedback.client_portal_users?.full_name || 'Client'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            {feedback.feedback && (
              <p className="text-sm text-gray-700 mt-2">{feedback.feedback}</p>
            )}
          </div>
        ))}

        {feedbacks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No feedback yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
