import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar as CalendarIcon, Plus, X, Clock, MapPin, Users, Edit2, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';

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

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'deadline': return 'bg-red-100 text-red-800 border-red-200';
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'milestone': return 'bg-green-100 text-green-800 border-green-200';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Manage deadlines, meetings, and milestones</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Add Event
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Previous
          </button>
          <h2 className="text-xl font-bold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
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
                className={`min-h-32 p-2 border rounded-lg cursor-pointer transition ${
                  isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                } ${isCurrentDay ? 'border-blue-500 border-2' : 'border-gray-200'}`}
              >
                <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}`}>
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
                      className={`text-xs p-1 rounded border ${getEventTypeColor(event.event_type)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="milestone">Milestone</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client (Optional)</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">No client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Office, Zoom, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingEvent.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Delete Event
                  </button>
                )}
                <div className={`flex gap-3 ${editingEvent ? '' : 'ml-auto'}`}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    {editingEvent ? 'Update' : 'Create'} Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
