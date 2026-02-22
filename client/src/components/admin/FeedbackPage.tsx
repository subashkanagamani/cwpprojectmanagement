import { useState, useEffect } from 'react';
import { MessageSquare, Send, Inbox, CheckCheck, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  read: boolean;
  created_at: string;
  from_user?: {
    full_name: string;
    role: string;
  };
  to_user?: {
    full_name: string;
    role: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
  email: string;
}

export function FeedbackPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('send');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [receivedFeedback, setReceivedFeedback] = useState<FeedbackItem[]>([]);
  const [sentFeedback, setSentFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to_user_id: '',
    message: '',
  });

  useEffect(() => {
    loadEmployees();
    loadReceivedFeedback();
    loadSentFeedback();
  }, []);

  async function loadEmployees() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .eq('status', 'active')
        .neq('id', profile?.id || '')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }

  async function loadReceivedFeedback() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          from_user:profiles!from_user_id(full_name, role)
        `)
        .eq('to_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceivedFeedback(data || []);
    } catch (error) {
      console.error('Error loading received feedback:', error);
    }
  }

  async function loadSentFeedback() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          to_user:profiles!to_user_id(full_name, role)
        `)
        .eq('from_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSentFeedback(data || []);
    } catch (error) {
      console.error('Error loading sent feedback:', error);
    }
  }

  async function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!formData.to_user_id) {
      showToast('Please select a recipient', 'error');
      return;
    }

    if (!formData.message.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        from_user_id: profile.id,
        to_user_id: formData.to_user_id,
        message: formData.message.trim(),
        read: false,
      });

      if (error) throw error;

      showToast('Feedback sent successfully', 'success');
      setFormData({ to_user_id: '', message: '' });
      loadSentFeedback();
    } catch (error: any) {
      showToast(error.message || 'Failed to send feedback', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(feedbackId: string) {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ read: true })
        .eq('id', feedbackId);

      if (error) throw error;
      loadReceivedFeedback();
    } catch (error: any) {
      showToast(error.message || 'Failed to mark as read', 'error');
    }
  }

  const unreadCount = receivedFeedback.filter(f => !f.read).length;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
          <p className="text-muted-foreground mt-1">
            Share and receive feedback with your team
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <Card className="stat-card-gradient blue">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                  <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="text-2xl font-bold text-foreground">{sentFeedback.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card-gradient green">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/30">
                  <Inbox className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received</p>
                  <p className="text-2xl font-bold text-foreground">{receivedFeedback.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card-gradient orange">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5 bg-orange-50 dark:bg-orange-950/30">
                  <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Received
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSendFeedback} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">
                      Send Feedback To <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.to_user_id}
                      onValueChange={(value) => setFormData({ ...formData, to_user_id: value })}
                    >
                      <SelectTrigger id="recipient">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex items-center gap-2">
                              <span>{employee.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({employee.role})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Share constructive feedback, recognition, or suggestions..."
                      rows={8}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Be specific, constructive, and professional in your feedback
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      <Send className="w-4 h-4 mr-2" />
                      {loading ? 'Sending...' : 'Send Feedback'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="received" className="mt-6">
            <div className="space-y-4">
              {receivedFeedback.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Inbox className="h-8 w-8 opacity-40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No feedback received yet. When team members send you feedback, it will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                receivedFeedback.map((feedback, index) => (
                  <div key={feedback.id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <Card className={!feedback.read ? 'border-primary border-2' : ''}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {feedback.from_user?.full_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {feedback.from_user?.role || 'Employee'} •{' '}
                                {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                          {!feedback.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(feedback.id)}
                            >
                              <CheckCheck className="w-4 h-4 mr-2" />
                              Mark Read
                            </Button>
                          )}
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-foreground whitespace-pre-wrap">{feedback.message}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            <div className="space-y-4">
              {sentFeedback.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCheck className="h-8 w-8 opacity-40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No feedback sent yet. Send your first feedback using the Send tab.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sentFeedback.map((feedback, index) => (
                  <div key={feedback.id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="rounded-lg p-2.5 bg-purple-50 dark:bg-purple-950/30">
                            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground">
                                To: {feedback.to_user?.full_name || 'Unknown'}
                              </span>
                              {feedback.read && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCheck className="w-3 h-3 mr-1" />
                                  Read
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {feedback.to_user?.role || 'Employee'} •{' '}
                              {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="prose prose-sm max-w-none ml-14">
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {feedback.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
