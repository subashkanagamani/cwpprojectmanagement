import { useState, useEffect } from 'react';
import { StickyNote, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface ClientNote {
  id: string;
  client_id: string;
  employee_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
  };
}

interface ClientNotesProps {
  clientId: string;
}

export function ClientNotes({ clientId }: ClientNotesProps) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadNotes();
  }, [clientId]);

  async function loadNotes() {
    try {
      const { data, error } = await supabase
        .from('client_notes')
        .select(`
          *,
          profile:profiles!employee_id(full_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      const { error } = await supabase
        .from('client_notes')
        .insert([{
          client_id: clientId,
          employee_id: user!.id,
          note: noteText.trim()
        }]);

      if (error) throw error;

      showToast('Note added successfully', 'success');
      setNoteText('');
      setShowAddForm(false);
      loadNotes();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleUpdateNote(noteId: string) {
    if (!noteText.trim()) return;

    try {
      const { error } = await supabase
        .from('client_notes')
        .update({
          note: noteText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;

      showToast('Note updated successfully', 'success');
      setEditingId(null);
      setNoteText('');
      loadNotes();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      showToast('Note deleted successfully', 'success');
      loadNotes();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function startEdit(note: ClientNote) {
    setEditingId(note.id);
    setNoteText(note.note);
    setShowAddForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setNoteText('');
  }

  function startAdd() {
    setShowAddForm(true);
    setEditingId(null);
    setNoteText('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
            {notes.length}
          </span>
        </div>
        {!showAddForm && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddNote} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write a note about this client..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNoteText('');
              }}
              className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteText.trim()}
              className={`px-3 py-1.5 rounded-lg transition text-sm ${
                noteText.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Add Note
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading notes...</p>
        </div>
      ) : notes.length === 0 && !showAddForm ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No notes yet</p>
          <p className="text-gray-400 text-sm mt-1">Add notes to keep track of important information</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isOwner = user?.id === note.employee_id;
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                {isEditing ? (
                  <div>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                          <span>{note.profile?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                          {note.updated_at && note.updated_at !== note.created_at && (
                            <>
                              <span>•</span>
                              <span>Edited</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() => startEdit(note)}
                            className="p-1.5 hover:bg-gray-100 rounded transition"
                            aria-label="Edit note"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 hover:bg-red-100 rounded transition"
                            aria-label="Delete note"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
