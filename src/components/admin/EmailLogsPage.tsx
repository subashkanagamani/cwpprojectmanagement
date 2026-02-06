import React, { useState, useEffect } from 'react';
import { Mail, Search, Filter, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';

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
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Clicked
        </span>
      );
    }
    if (email.opened_at) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
          <Mail className="h-3 w-3" />
          Opened
        </span>
      );
    }
    if (email.status === 'failed') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Sent
      </span>
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-gray-600">Track all sent emails and their engagement metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Sent</div>
          <div className="text-2xl font-bold text-gray-900">{emails.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Open Rate</div>
          <div className="text-2xl font-bold text-blue-600">{stats.opened}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Click Rate</div>
          <div className="text-2xl font-bold text-green-600">{stats.clicked}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {emails.filter((e) => e.status === 'failed').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded-lg px-4 py-2"
          />
        </div>

        <div className="divide-y">
          <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 font-medium text-sm text-gray-700">
            <div className="col-span-3">Recipient</div>
            <div className="col-span-3">Subject</div>
            <div className="col-span-2">Sent By</div>
            <div className="col-span-2">Sent At</div>
            <div className="col-span-2">Status</div>
          </div>

          {filteredEmails.map((email) => (
            <div
              key={email.id}
              className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 items-center"
            >
              <div className="col-span-3">
                <div className="font-medium text-gray-900">{email.recipient_email}</div>
              </div>
              <div className="col-span-3">
                <div className="text-sm text-gray-900">{email.subject}</div>
                {email.template_used && (
                  <div className="text-xs text-gray-500">Template: {email.template_used}</div>
                )}
              </div>
              <div className="col-span-2 text-sm text-gray-600">
                {email.profiles?.full_name || 'System'}
              </div>
              <div className="col-span-2 text-sm text-gray-600">
                {format(new Date(email.sent_at), 'MMM d, yyyy HH:mm')}
              </div>
              <div className="col-span-2">{getStatusBadge(email)}</div>
            </div>
          ))}
        </div>

        {filteredEmails.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No email logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
