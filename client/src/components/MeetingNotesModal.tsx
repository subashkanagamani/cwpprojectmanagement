import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';

interface MeetingNote {
  id: string;
  client_id: string;
  title: string;
  date: string;
  notes: string;
  action_items: any[];
  attendees: any[];
  next_meeting: string | null;
}

interface MeetingNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  clientId: string;
  eventTitle?: string;
  eventDate?: string;
}

export function MeetingNotesModal({
  isOpen,
  onClose,
  eventId,
  clientId,
  eventTitle = '',
  eventDate = new Date().toISOString(),
}: MeetingNotesModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingNote, setExistingNote] = useState<MeetingNote | null>(null);
  const [formData, setFormData] = useState({
    title: eventTitle,
    notes: '',
    attendees: [] as string[],
    action_items: [] as string[],
    next_meeting: '',
  });
  const [newAttendee, setNewAttendee] = useState('');
  const [newActionItem, setNewActionItem] = useState('');

  useEffect(() => {
    if (isOpen && eventId) {
      loadExistingNotes();
    }
  }, [isOpen, eventId]);

  const loadExistingNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingNote(data);
        setFormData({
          title: data.title,
          notes: data.notes,
          attendees: data.attendees || [],
          action_items: data.action_items || [],
          next_meeting: data.next_meeting || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, newAttendee.trim()],
      });
      setNewAttendee('');
    }
  };

  const handleRemoveAttendee = (index: number) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter((_, i) => i !== index),
    });
  };

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setFormData({
        ...formData,
        action_items: [...formData.action_items, newActionItem.trim()],
      });
      setNewActionItem('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setFormData({
      ...formData,
      action_items: formData.action_items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.notes) {
      showToast('Please fill in title and notes', 'error');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        client_id: clientId,
        title: formData.title,
        date: eventDate,
        notes: formData.notes,
        attendees: formData.attendees,
        action_items: formData.action_items,
        next_meeting: formData.next_meeting || null,
        created_by: user?.id,
      };

      if (existingNote) {
        const { error } = await supabase
          .from('meeting_notes')
          .update(payload)
          .eq('id', existingNote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meeting_notes')
          .insert(payload);

        if (error) throw error;
      }

      showToast('Meeting notes saved successfully', 'success');
      onClose();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting Notes</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Meeting Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Status Update"
                required
              />
            </div>

            <div>
              <Label>Attendees</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    placeholder="Add attendee name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAttendee();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddAttendee} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.attendees.map((attendee, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm"
                      >
                        <span>{attendee}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(index)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Meeting Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Document the meeting discussion..."
                rows={8}
                required
              />
            </div>

            <div>
              <Label>Action Items</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    placeholder="Add action item"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddActionItem();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddActionItem} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.action_items.length > 0 && (
                  <ul className="space-y-2">
                    {formData.action_items.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start justify-between p-2 border rounded"
                      >
                        <span className="flex-1">{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveActionItem(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <Label>Next Meeting Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.next_meeting}
                onChange={(e) => setFormData({ ...formData, next_meeting: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
