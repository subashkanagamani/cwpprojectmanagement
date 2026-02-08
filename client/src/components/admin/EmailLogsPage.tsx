import { useState, useEffect } from 'react';
import { Mail, Search, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  useEffect(() => {
    fetchEmails();
  }, [statusFilter, dateFilter]);

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
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email Logs</h1>
          <p className="text-sm text-muted-foreground">Track all sent emails and their engagement metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-total-sent">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sent</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{emails.length}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-open-rate">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Open Rate</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{stats.opened}%</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-click-rate">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Click Rate</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{stats.clicked}%</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-failed">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Failed</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {emails.filter((e) => e.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

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
                <TableRow key={email.id} data-testid={`row-email-${email.id}`}>
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
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No email logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
