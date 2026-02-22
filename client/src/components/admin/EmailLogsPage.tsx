import { useState, useEffect } from 'react';
import { Mail, Search, ExternalLink, CheckCircle, XCircle, Send, MousePointerClick } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_used: string;
  status: 'sent' | 'failed' | 'opened' | 'clicked';
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  sent_by: string;
  profiles: {
    full_name: string;
  };
}

export default function EmailLogsPage() {
  const { showToast } = useToast();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetchEmails();
    fetchTemplates();
  }, [statusFilter, dateFilter]);

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase
        .from('email_templates')
        .select('id, name, subject, body')
        .order('name');
      if (data) setTemplates(data);
    } catch {
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'none') {
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeSubject(template.subject);
      setComposeBody(template.body);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setIsSending(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send email');
      }

      showToast('Email sent successfully', 'success');
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setSelectedTemplate('');
      fetchEmails();
    } catch (error: any) {
      showToast(error.message || 'Failed to send email', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_logs')
        .select(`
          *,
          profiles:sent_by(full_name)
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter) {
        const date = new Date(dateFilter);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.gte('sent_at', date.toISOString()).lt('sent_at', nextDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      showToast('Failed to load email logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (email: EmailLog) => {
    if (email.clicked_at) {
      return (
        <Badge variant="default" className="no-default-active-elevate">
          <ExternalLink className="h-3 w-3 mr-1" />
          Clicked
        </Badge>
      );
    }
    if (email.opened_at) {
      return (
        <Badge variant="secondary" className="no-default-active-elevate">
          <Mail className="h-3 w-3 mr-1" />
          Opened
        </Badge>
      );
    }
    if (email.status === 'failed') {
      return (
        <Badge variant="destructive" className="no-default-active-elevate">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="no-default-active-elevate">
        <CheckCircle className="h-3 w-3 mr-1" />
        Sent
      </Badge>
    );
  };

  const getEngagementRate = () => {
    if (emails.length === 0) return { opened: 0, clicked: 0 };
    const opened = emails.filter((e) => e.opened_at).length;
    const clicked = emails.filter((e) => e.clicked_at).length;
    return {
      opened: ((opened / emails.length) * 100).toFixed(1),
      clicked: ((clicked / emails.length) * 100).toFixed(1),
    };
  };

  const stats = getEngagementRate();

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-up">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Logs</h1>
          <p className="text-muted-foreground mt-1">Track all sent emails and their engagement metrics</p>
        </div>
        <Button onClick={() => setIsComposeOpen(true)} className="gap-2">
          <Send className="h-4 w-4" />
          Compose Email
        </Button>
      </div>

      <div className="animate-fade-up grid grid-cols-1 md:grid-cols-4 gap-5" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue" data-testid="stat-total-sent">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold text-foreground">{emails.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green" data-testid="stat-open-rate">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/30">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold text-foreground">{stats.opened}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple" data-testid="stat-click-rate">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-purple-50 dark:bg-purple-950/30">
                <MousePointerClick className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold text-foreground">{stats.clicked}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient orange" data-testid="stat-failed">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-orange-50 dark:bg-orange-950/30">
                <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-foreground">
                  {emails.filter((e) => e.status === 'failed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Card>
          <CardHeader>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-emails"
                />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
                <SelectTrigger className="w-[160px]" data-testid="trigger-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
                data-testid="input-date-filter"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email) => (
                  <TableRow key={email.id} data-testid={`row-email-${email.id}`} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-foreground">{email.recipient_email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{email.subject}</div>
                      {email.template_used && (
                        <div className="text-xs text-muted-foreground">Template: {email.template_used}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {email.profiles?.full_name || 'System'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(email.sent_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getStatusBadge(email)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredEmails.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Mail className="h-8 w-8 opacity-40 mb-3" />
                <p className="text-sm text-muted-foreground">No email logs found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                type="text"
                placeholder="Email subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Write your email..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={8}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsComposeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
