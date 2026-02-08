import { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, Edit2, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { ReportComment } from '../lib/database.types';

interface CommentWithProfile extends ReportComment {
  profile?: {
    full_name: string;
    role: string;
  };
}

interface ReportCommentsProps {
  reportId: string;
  canComment?: boolean;
  canDelete?: boolean;
  showInternal?: boolean;
}

export function ReportComments({
  reportId,
  canComment = true,
  canDelete = false,
  showInternal = false
}: ReportCommentsProps) {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const { showToast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    loadComments();
  }, [reportId]);

  async function loadComments() {
    try {
      let query = supabase
        .from('report_comments')
        .select(`
          *,
          profile:profiles!user_id(full_name, role)
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (!showInternal) {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('report_comments')
        .insert([{
          report_id: reportId,
          user_id: user.id,
          comment: newComment.trim(),
          is_internal: isInternal
        }]);

      if (error) throw error;

      showToast('Comment added successfully', 'success');
      setNewComment('');
      setIsInternal(false);
      loadComments();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(commentId: string) {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('report_comments')
        .update({
          comment: editText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      showToast('Comment updated successfully', 'success');
      setEditingId(null);
      setEditText('');
      loadComments();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('report_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      showToast('Comment deleted successfully', 'success');
      loadComments();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function startEdit(comment: CommentWithProfile) {
    setEditingId(comment.id);
    setEditText(comment.comment);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
            {comments.length}
          </span>
        </div>
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={submitting}
                />
                <span className="text-gray-700">Internal comment (visible only to staff)</span>
              </label>
            )}
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !newComment.trim() || submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No comments yet</p>
          {canComment && (
            <p className="text-gray-400 text-sm mt-1">Be the first to comment on this report</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            const canEdit = isOwner;
            const canDeleteComment = isOwner || canDelete;
            const isEditing = editingId === comment.id;

            return (
              <div
                key={comment.id}
                className={`p-4 border rounded-lg ${
                  comment.is_internal
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.profile?.full_name || 'Unknown User'}
                      </span>
                      {comment.is_internal && (
                        <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                          Internal
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTime(comment.created_at)}
                        {comment.updated_at && comment.updated_at !== comment.created_at && (
                          <span className="ml-1">(edited)</span>
                        )}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdate(comment.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => startEdit(comment)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Edit comment"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      {canDeleteComment && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInternal && isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Internal Comments</p>
            <p>Comments marked as internal are only visible to admin and employee users.</p>
          </div>
        </div>
      )}
    </div>
  );
}
