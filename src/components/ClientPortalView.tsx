import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Calendar, TrendingUp, FileText, LogOut, User, Building2, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ReportFeedback from './ReportFeedback';

interface ClientData {
  id: string;
  name: string;
  industry?: string;
  contact_name?: string;
  contact_email?: string;
}

interface ReportData {
  id: string;
  week_start_date: string;
  work_summary: string;
  status: string;
  key_wins: string;
  challenges: string;
  next_week_plan: string;
  approval_status: string;
  created_at: string;
  services?: { name: string };
  profiles?: { full_name: string };
  service_metrics?: Array<{
    metric_data: any;
  }>;
}

interface PortalUserData {
  id: string;
  client_id: string;
  full_name: string;
  email: string;
}

export function ClientPortalView() {
  const { user, signOut } = useAuth();
  const [portalUser, setPortalUser] = useState<PortalUserData | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent'>('recent');

  useEffect(() => {
    if (user) {
      loadPortalData();
    }
  }, [user]);

  const loadPortalData = async () => {
    try {
      const { data: portalUserData, error: portalError } = await supabase
        .from('client_portal_users')
        .select('*')
        .eq('auth_user_id', user!.id)
        .single();

      if (portalError) throw portalError;
      if (!portalUserData) {
        throw new Error('Portal user not found');
      }

      setPortalUser(portalUserData);

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', portalUserData.client_id)
        .single();

      if (clientError) throw clientError;
      setClientData(client);

      const { data: reportsData, error: reportsError } = await supabase
        .from('weekly_reports')
        .select(`
          *,
          services(name),
          profiles(full_name),
          service_metrics(metric_data)
        `)
        .eq('client_id', portalUserData.client_id)
        .eq('approval_status', 'approved')
        .order('week_start_date', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);
    } catch (error: any) {
      console.error('Error loading portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      on_track: 'bg-green-100 text-green-800',
      needs_attention: 'bg-yellow-100 text-yellow-800',
      delayed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!portalUser || !clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load portal data</p>
          <button
            onClick={handleLogout}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const filteredReports = filter === 'recent' ? reports.slice(0, 10) : reports;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ClientFlow Portal</h1>
                <p className="text-xs text-gray-500">{clientData.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{portalUser.full_name}</p>
                <p className="text-xs text-gray-500">{portalUser.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{clientData.name}</h2>
                    {clientData.industry && (
                      <p className="text-sm text-gray-600">{clientData.industry}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-medium mb-1">Total Reports</p>
                    <p className="text-3xl font-bold text-blue-900">{reports.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium mb-1">On Track</p>
                    <p className="text-3xl font-bold text-green-900">
                      {reports.filter(r => r.status === 'on_track').length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                    <p className="text-sm text-yellow-700 font-medium mb-1">Needs Attention</p>
                    <p className="text-3xl font-bold text-yellow-900">
                      {reports.filter(r => r.status === 'needs_attention').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Weekly Reports</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('recent')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Recent (10)
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              All Reports
            </button>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No reports available yet</p>
            <p className="text-gray-500 text-sm mt-2">Reports will appear here once they are approved</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">
                          Week of {format(new Date(report.week_start_date), 'MMM d, yyyy')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {report.services && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {report.services.name}
                          </span>
                        )}
                        {report.profiles && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {report.profiles.full_name}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {report.service_metrics && report.service_metrics.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        Performance Metrics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(report.service_metrics[0].metric_data || {}).slice(0, 8).map(([key, value]) => (
                          <div key={key} className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">{key.replace(/_/g, ' ')}</p>
                            <p className="text-lg font-bold text-gray-900">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {report.work_summary && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Work Summary</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{report.work_summary}</p>
                      </div>
                    )}

                    {report.key_wins && (
                      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                        <h4 className="text-sm font-semibold text-green-900 mb-2">Key Wins</h4>
                        <p className="text-green-800 whitespace-pre-wrap">{report.key_wins}</p>
                      </div>
                    )}

                    {report.challenges && (
                      <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                        <h4 className="text-sm font-semibold text-yellow-900 mb-2">Challenges</h4>
                        <p className="text-yellow-800 whitespace-pre-wrap">{report.challenges}</p>
                      </div>
                    )}

                    {report.next_week_plan && (
                      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">Next Week's Plan</h4>
                        <p className="text-blue-800 whitespace-pre-wrap">{report.next_week_plan}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <ReportFeedback
                      reportId={report.id}
                      isClientPortal={true}
                      portalUserId={portalUser.id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Powered by ClientFlow - Client Performance Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
