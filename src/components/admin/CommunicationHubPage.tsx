import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Phone, Video, Mail, Plus, X, Search, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';

interface Communication {
  id: string;
  client_id: string;
  type: 'email' | 'call' | 'meeting' | 'message' | 'other';
  direction: 'inbound' | 'outbound';
  subject: string | null;
  summary: string;
  content: string | null;
  created_by: string;
  created_at: string;
  clients?: { name: string };
  profiles?: { full_name: string };
}

interface MeetingNote {
  id: string;
  client_id: string;
  title: string;
  date: string;
  attendees: any;
  agenda: string | null;
  notes: string;
  action_items: any;
  next_meeting: string | null;
  created_by: string;
  created_at: string;
  clients?: { name: string };
  profiles?: { full_name: string };
}

export function CommunicationHubPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'timeline' | 'meetings'>('timeline');
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCommModal, setShowCommModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [commFormData, setCommFormData] = useState({
    client_id: '',
    type: 'email' as Communication['type'],
    direction: 'outbound' as Communication['direction'],
    subject: '',
    summary: '',
    content: '',
  });

  const [meetingFormData, setMeetingFormData] = useState({
    client_id: '',
    title: '',
    date: new Date().toISOString().slice(0, 16),
    attendees: [] as string[],
    agenda: '',
    notes: '',
    action_items: [] as { task: string; assignee: string; due_date: string }[],
    next_meeting: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadCommunications(),
      loadMeetings(),
      loadClients(),
      loadEmployees(),
    ]);
  };

  const loadCommunications = async () => {
    const { data, error } = await supabase
      .from('communications')
      .select('*, clients(name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading communications:', error);
      showToast('Failed to load communications', 'error');
    } else {
      setCommunications(data || []);
    }
  };

  const loadMeetings = async () => {
    const { data, error } = await supabase
      .from('meeting_notes')
      .select('*, clients(name), profiles(full_name)')
      .order('date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading meetings:', error);
      showToast('Failed to load meetings', 'error');
    } else {
      setMeetings(data || []);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    if (data) setClients(data);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'active');
    if (data) setEmployees(data);
  };

  const handleCommSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from('communications').insert({
        ...commFormData,
        created_by: user.id,
      });

      if (error) throw error;
      showToast('Communication logged successfully', 'success');
      setShowCommModal(false);
      loadCommunications();
    } catch (error) {
      console.error('Error saving communication:', error);
      showToast('Failed to log communication', 'error');
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from('meeting_notes').insert({
        ...meetingFormData,
        attendees: meetingFormData.attendees,
        action_items: meetingFormData.action_items,
        next_meeting: meetingFormData.next_meeting || null,
        created_by: user.id,
      });

      if (error) throw error;
      showToast('Meeting notes saved successfully', 'success');
      setShowMeetingModal(false);
      loadMeetings();
    } catch (error) {
      console.error('Error saving meeting notes:', error);
      showToast('Failed to save meeting notes', 'error');
    }
  };

  const getCommTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'call': return <Phone className="h-5 w-5" />;
      case 'meeting': return <Video className="h-5 w-5" />;
      case 'message': return <MessageSquare className="h-5 w-5" />;
      default: return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getCommTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'call': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'message': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredComms = communications.filter(comm => {
    const matchesSearch = comm.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || comm.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication Hub</h1>
          <p className="text-gray-600 mt-1">Track all client interactions and meetings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCommModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            <Plus className="h-5 w-5" />
            Log Communication
          </button>
          <button
            onClick={() => setShowMeetingModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            <Plus className="h-5 w-5" />
            Meeting Notes
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'timeline'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'meetings'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Meeting Notes
        </button>
      </div>

      {activeTab === 'timeline' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search communications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="message">Message</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredComms.map((comm) => (
              <div key={comm.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getCommTypeColor(comm.type)}`}>
                    {getCommTypeIcon(comm.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{comm.clients?.name}</h3>
                        {comm.subject && <p className="text-sm text-gray-600">{comm.subject}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(comm.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{comm.summary}</p>
                    {comm.content && (
                      <details className="text-sm text-gray-600 mt-2">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                          View details
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap">{comm.content}</p>
                      </details>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Logged by {comm.profiles?.full_name}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {filteredComms.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
                <p className="text-gray-600">Log your first client interaction to get started</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'meetings' && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{meeting.title}</h3>
                  <p className="text-sm text-gray-600">{meeting.clients?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(meeting.date), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-xs text-gray-500">by {meeting.profiles?.full_name}</p>
                </div>
              </div>

              {meeting.attendees && Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attendees:</p>
                  <div className="flex flex-wrap gap-2">
                    {meeting.attendees.map((attendee: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {attendee}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {meeting.agenda && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Agenda:</p>
                  <p className="text-gray-600">{meeting.agenda}</p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
              </div>

              {meeting.action_items && Array.isArray(meeting.action_items) && meeting.action_items.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Action Items:</p>
                  <ul className="space-y-2">
                    {meeting.action_items.map((item: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-600">•</span>
                        <div className="flex-1">
                          <p className="text-gray-700">{item.task}</p>
                          <p className="text-xs text-gray-500">
                            {item.assignee} • Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meeting.next_meeting && (
                <p className="text-sm text-gray-600">
                  Next meeting: {format(new Date(meeting.next_meeting), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
          ))}

          {meetings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meeting notes yet</h3>
              <p className="text-gray-600">Create your first meeting note to track discussions</p>
            </div>
          )}
        </div>
      )}

      {showCommModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Log Communication</h2>
              <button onClick={() => setShowCommModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCommSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                  <select
                    value={commFormData.client_id}
                    onChange={(e) => setCommFormData({ ...commFormData, client_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={commFormData.type}
                    onChange={(e) => setCommFormData({ ...commFormData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="message">Message</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="outbound"
                      checked={commFormData.direction === 'outbound'}
                      onChange={(e) => setCommFormData({ ...commFormData, direction: e.target.value as any })}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Outbound (We contacted them)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="inbound"
                      checked={commFormData.direction === 'inbound'}
                      onChange={(e) => setCommFormData({ ...commFormData, direction: e.target.value as any })}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Inbound (They contacted us)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={commFormData.subject}
                  onChange={(e) => setCommFormData({ ...commFormData, subject: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                <input
                  type="text"
                  value={commFormData.summary}
                  onChange={(e) => setCommFormData({ ...commFormData, summary: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Brief summary of the communication"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                <textarea
                  value={commFormData.content}
                  onChange={(e) => setCommFormData({ ...commFormData, content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Full details of the communication..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCommModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Log Communication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Meeting Notes</h2>
              <button onClick={() => setShowMeetingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMeetingSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                  <select
                    value={meetingFormData.client_id}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, client_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Date & Time</label>
                  <input
                    type="datetime-local"
                    value={meetingFormData.date}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Title</label>
                <input
                  type="text"
                  value={meetingFormData.title}
                  onChange={(e) => setMeetingFormData({ ...meetingFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Q1 Strategy Review"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
                <select
                  multiple
                  value={meetingFormData.attendees}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setMeetingFormData({ ...meetingFormData, attendees: selected });
                  }}
                  className="w-full px-4 py-2 border rounded-lg h-32"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agenda</label>
                <textarea
                  value={meetingFormData.agenda}
                  onChange={(e) => setMeetingFormData({ ...meetingFormData, agenda: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Meeting agenda..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={meetingFormData.notes}
                  onChange={(e) => setMeetingFormData({ ...meetingFormData, notes: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Meeting notes, key discussion points..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Meeting</label>
                <input
                  type="datetime-local"
                  value={meetingFormData.next_meeting}
                  onChange={(e) => setMeetingFormData({ ...meetingFormData, next_meeting: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Save Meeting Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
