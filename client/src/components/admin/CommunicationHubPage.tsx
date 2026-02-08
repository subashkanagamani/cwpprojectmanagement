import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Phone, Video, Mail, Plus, Search, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

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

  const getCommTypeIconStyle = (type: string) => {
    switch (type) {
      case 'email': return 'rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400';
      case 'call': return 'rounded-lg p-2.5 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400';
      case 'meeting': return 'rounded-lg p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400';
      case 'message': return 'rounded-lg p-2.5 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400';
      default: return 'rounded-lg p-2.5 bg-muted text-muted-foreground';
    }
  };

  const filteredComms = communications.filter(comm => {
    const matchesSearch = comm.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || comm.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Communication Hub</h1>
          <p className="text-sm text-muted-foreground">Track all client interactions and meetings</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            data-testid="button-log-communication"
            onClick={() => setShowCommModal(true)}
          >
            <Plus className="h-4 w-4" />
            Log Communication
          </Button>
          <Button
            data-testid="button-meeting-notes"
            variant="outline"
            onClick={() => setShowMeetingModal(true)}
          >
            <Plus className="h-4 w-4" />
            Meeting Notes
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          data-testid="tab-timeline"
          variant={activeTab === 'timeline' ? 'default' : 'outline'}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </Button>
        <Button
          data-testid="tab-meetings"
          variant={activeTab === 'meetings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('meetings')}
        >
          Meeting Notes
        </Button>
      </div>

      {activeTab === 'timeline' && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    data-testid="input-search-communications"
                    type="text"
                    placeholder="Search communications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="select-filter-type" className="w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredComms.map((comm) => (
              <Card key={comm.id} data-testid={`card-communication-${comm.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={getCommTypeIconStyle(comm.type)}>
                      {getCommTypeIcon(comm.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{comm.clients?.name}</h3>
                          {comm.subject && <p className="text-sm text-muted-foreground">{comm.subject}</p>}
                        </div>
                        <div className="text-right">
                          <Badge variant={comm.direction === 'inbound' ? 'secondary' : 'outline'} className="no-default-active-elevate no-default-hover-elevate">
                            {comm.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(comm.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <p className="text-foreground mb-2">{comm.summary}</p>
                      {comm.content && (
                        <details className="text-sm text-muted-foreground mt-2">
                          <summary className="cursor-pointer text-primary">
                            View details
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap">{comm.content}</p>
                        </details>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Logged by {comm.profiles?.full_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredComms.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No communications found</h3>
                  <p className="text-muted-foreground">Log your first client interaction to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {activeTab === 'meetings' && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {meetings.map((meeting) => (
            <Card key={meeting.id} data-testid={`card-meeting-${meeting.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{meeting.title}</h3>
                    <p className="text-sm text-muted-foreground">{meeting.clients?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(meeting.date), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-xs text-muted-foreground">by {meeting.profiles?.full_name}</p>
                  </div>
                </div>

                {meeting.attendees && Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-2">Attendees:</p>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((attendee: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="no-default-active-elevate no-default-hover-elevate">
                          {attendee}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {meeting.agenda && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-1">Agenda:</p>
                    <p className="text-muted-foreground">{meeting.agenda}</p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-medium text-foreground mb-1">Notes:</p>
                  <p className="text-foreground whitespace-pre-wrap">{meeting.notes}</p>
                </div>

                {meeting.action_items && Array.isArray(meeting.action_items) && meeting.action_items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-2">Action Items:</p>
                    <ul className="space-y-2">
                      {meeting.action_items.map((item: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                          <div className="flex-1">
                            <p className="text-foreground">{item.task}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.assignee} - Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meeting.next_meeting && (
                  <p className="text-sm text-muted-foreground">
                    Next meeting: {format(new Date(meeting.next_meeting), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {meetings.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No meeting notes yet</h3>
                <p className="text-muted-foreground">Create your first meeting note to track discussions</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showCommModal} onOpenChange={setShowCommModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCommSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={commFormData.client_id}
                  onValueChange={(value) => setCommFormData({ ...commFormData, client_id: value })}
                >
                  <SelectTrigger data-testid="select-comm-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={commFormData.type}
                  onValueChange={(value) => setCommFormData({ ...commFormData, type: value as any })}
                >
                  <SelectTrigger data-testid="select-comm-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="outbound"
                    checked={commFormData.direction === 'outbound'}
                    onChange={(e) => setCommFormData({ ...commFormData, direction: e.target.value as any })}
                    className="h-4 w-4"
                    data-testid="radio-direction-outbound"
                  />
                  <span className="text-sm">Outbound (We contacted them)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="inbound"
                    checked={commFormData.direction === 'inbound'}
                    onChange={(e) => setCommFormData({ ...commFormData, direction: e.target.value as any })}
                    className="h-4 w-4"
                    data-testid="radio-direction-inbound"
                  />
                  <span className="text-sm">Inbound (They contacted us)</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                data-testid="input-comm-subject"
                type="text"
                value={commFormData.subject}
                onChange={(e) => setCommFormData({ ...commFormData, subject: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label>Summary</Label>
              <Input
                data-testid="input-comm-summary"
                type="text"
                value={commFormData.summary}
                onChange={(e) => setCommFormData({ ...commFormData, summary: e.target.value })}
                placeholder="Brief summary of the communication"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                data-testid="textarea-comm-content"
                value={commFormData.content}
                onChange={(e) => setCommFormData({ ...commFormData, content: e.target.value })}
                rows={4}
                placeholder="Full details of the communication..."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                data-testid="button-cancel-comm"
                type="button"
                variant="outline"
                onClick={() => setShowCommModal(false)}
              >
                Cancel
              </Button>
              <Button data-testid="button-submit-comm" type="submit">
                Log Communication
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMeetingModal} onOpenChange={setShowMeetingModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting Notes</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleMeetingSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={meetingFormData.client_id}
                  onValueChange={(value) => setMeetingFormData({ ...meetingFormData, client_id: value })}
                >
                  <SelectTrigger data-testid="select-meeting-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Date & Time</Label>
                <Input
                  data-testid="input-meeting-date"
                  type="datetime-local"
                  value={meetingFormData.date}
                  onChange={(e) => setMeetingFormData({ ...meetingFormData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meeting Title</Label>
              <Input
                data-testid="input-meeting-title"
                type="text"
                value={meetingFormData.title}
                onChange={(e) => setMeetingFormData({ ...meetingFormData, title: e.target.value })}
                placeholder="e.g., Q1 Strategy Review"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Attendees</Label>
              <select
                multiple
                value={meetingFormData.attendees}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setMeetingFormData({ ...meetingFormData, attendees: selected });
                }}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-32"
                data-testid="select-meeting-attendees"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div className="space-y-2">
              <Label>Agenda</Label>
              <Textarea
                data-testid="textarea-meeting-agenda"
                value={meetingFormData.agenda}
                onChange={(e) => setMeetingFormData({ ...meetingFormData, agenda: e.target.value })}
                rows={2}
                placeholder="Meeting agenda..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                data-testid="textarea-meeting-notes"
                value={meetingFormData.notes}
                onChange={(e) => setMeetingFormData({ ...meetingFormData, notes: e.target.value })}
                rows={6}
                placeholder="Meeting notes, key discussion points..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Next Meeting</Label>
              <Input
                data-testid="input-next-meeting"
                type="datetime-local"
                value={meetingFormData.next_meeting}
                onChange={(e) => setMeetingFormData({ ...meetingFormData, next_meeting: e.target.value })}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                data-testid="button-cancel-meeting"
                type="button"
                variant="outline"
                onClick={() => setShowMeetingModal(false)}
              >
                Cancel
              </Button>
              <Button data-testid="button-submit-meeting" type="submit">
                Save Meeting Notes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
