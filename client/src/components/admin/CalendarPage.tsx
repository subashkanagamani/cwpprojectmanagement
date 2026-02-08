import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Clock, MapPin, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'deadline' | 'meeting' | 'milestone' | 'reminder';
  start_time: string;
  end_time: string | null;
  client_id: string | null;
  attendees: any;
  location: string | null;
  client?: { name: string };
}

export function CalendarPage() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'meeting' as 'deadline' | 'meeting' | 'milestone' | 'reminder',
    start_time: '',
    end_time: '',
    client_id: '',
    location: '',
  });

  useEffect(() => {
    loadEvents();
    loadClients();
  }, [currentDate]);

  const loadEvents = async () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, clients(name)')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time');

    if (error) {
      console.error('Error loading events:', error);
      showToast('Failed to load events', 'error');
    } else {
      setEvents(data || []);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    if (data) setClients(data);
  };

  const openModal = (event?: CalendarEvent, date?: Date) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: event.end_time ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm") : '',
        client_id: event.client_id || '',
        location: event.location || '',
      });
    } else {
      setEditingEvent(null);
      const startTime = date || new Date();
      startTime.setHours(9, 0);
      setFormData({
        title: '',
        description: '',
        event_type: 'meeting',
        start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: '',
        client_id: '',
        location: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const eventData = {
      ...formData,
      client_id: formData.client_id || null,
      end_time: formData.end_time || null,
      location: formData.location || null,
      created_by: user.id,
      attendees: [],
    };

    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', editingEvent.id);
        if (error) throw error;
        showToast('Event updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert(eventData);
        if (error) throw error;
        showToast('Event created successfully', 'success');
      }
      setShowModal(false);
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Failed to save event', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete event', 'error');
    } else {
      showToast('Event deleted successfully', 'success');
      loadEvents();
    }
  };

  const getEventTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'deadline': return 'destructive';
      case 'meeting': return 'default';
      case 'milestone': return 'secondary';
      case 'reminder': return 'outline';
      default: return 'secondary';
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(event =>
      isSameDay(new Date(event.start_time), date)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground">Manage deadlines, meetings, and milestones</p>
        </div>
        <Button onClick={() => openModal()} data-testid="button-add-event">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              data-testid="button-previous-month"
            >
              Previous
            </Button>
            <h2 className="text-xl font-semibold text-foreground" data-testid="text-current-month">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              data-testid="button-next-month"
            >
              Next
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => openModal(undefined, day)}
                  className={`min-h-32 p-2 border rounded-md cursor-pointer transition ${
                    isCurrentMonth ? 'hover-elevate' : 'bg-muted'
                  } ${isCurrentDay ? 'border-primary border-2' : 'border-border'}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(event);
                        }}
                        data-testid={`card-event-${event.id}`}
                      >
                        <Badge variant={getEventTypeBadgeVariant(event.event_type)} className="text-xs w-full justify-start truncate">
                          {event.title}
                        </Badge>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-2 block">Title</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="input-title"
              />
            </div>

            <div>
              <Label className="mb-2 block">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value as any })}
              >
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  data-testid="input-start-time"
                />
              </div>
              <div>
                <Label className="mb-2 block">End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  data-testid="input-end-time"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Client (Optional)</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}
              >
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Location</Label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Office, Zoom, etc."
                data-testid="input-location"
              />
            </div>

            <div>
              <Label className="mb-2 block">Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                data-testid="input-description"
              />
            </div>

            <DialogFooter className="gap-2 flex-wrap pt-4 border-t border-border">
              {editingEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDelete(editingEvent.id)}
                  className="mr-auto"
                  data-testid="button-delete-event"
                >
                  Delete Event
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-event">
                {editingEvent ? 'Update' : 'Create'} Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
