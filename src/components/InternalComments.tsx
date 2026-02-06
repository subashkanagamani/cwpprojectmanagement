import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Send, Edit2, Trash2, AtSign } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

interface InternalComment {
  id: string;
  entity_type: 'client' | 'report' | 'goal' | 'timesheet';
  entity_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface InternalCommentsProps {
  entityType: 'client' | 'report' | 'goal' | 'timesheet';
  entityId: string;
  entityName?: string;
}

export function InternalComments({ entityType, entityId, entityName }: InternalCommentsProps) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<InternalComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadComments();
    getCurrentUser();
  }, [entityType, entityId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_comments')
        .select('*, profiles(full_name, email)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      showToast('Failed to load comments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      showToast('Please enter a comment', 'error');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('internal_comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          comment: newComment,
        });

      if (error) throw error;

      const mentions = extractMentions(newComment);
      if (mentions.length > 0) {
        await handleMentions(mentions);
      }

      showToast('Comment added successfully', 'success');
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Failed to add comment', 'error');
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) {
      showToast('Comment cannot be empty', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('internal_comments')
        .update({
          comment: editText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      showToast('Comment updated successfully', 'success');
      setEditingComment(null);
      setEditText('');
      loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      showToast('Failed to update comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('internal_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      showToast('Comment deleted successfully', 'success');
      loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Failed to delete comment', 'error');
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleMentions = async (mentions: string[]) => {
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('email', mentions.map(m => `${m}@example.com`));

      if (users && users.length > 0) {
        for (const user of users) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'You were mentioned',
            message: `You were mentioned in a comment on ${entityName || entityType}`,
            type: 'info',
            link: `/${entityType}s/${entityId}`,
          });
        }
      }
    } catch (error) {
      console.error('Error handling mentions:', error);
    }
  };

  const startEditing = (comment: InternalComment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditText('');
  };

  const renderComment = (comment: InternalComment) => {
    const text = comment.comment;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Internal Comments ({comments.length})
        </h3>
      </div>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="border-l-2 border-blue-200 pl-4 py-2">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium text-gray-900">
                  {comment.profiles?.full_name || 'Unknown'}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                </span>
                {comment.created_at !== comment.updated_at && (
                  <span className="text-xs text-gray-400 ml-1">(edited)</span>
                )}
              </div>

              {comment.user_id === currentUserId && (
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditing(comment)}
                    className="p-1 hover:bg-gray-100 rounded transition"
                  >
                    <Edit2 className="h-3 w-3 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 hover:bg-gray-100 rounded transition"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </button>
                </div>
              )}
            </div>

            {editingComment === comment.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateComment(comment.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 border text-sm rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {renderComment(comment)}
              </p>
            )}
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No comments yet. Be the first to add one!
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg resize-none pr-12"
            rows={3}
            placeholder="Add an internal comment... Use @ to mention team members"
          />
          <button
            onClick={handleAddComment}
            className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!newComment.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <AtSign className="h-3 w-3 inline" /> Tip: Use @name to mention team members
        </p>
      </div>
    </div>
  );
}
