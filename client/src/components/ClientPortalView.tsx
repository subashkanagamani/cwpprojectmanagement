import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import {
  Calendar, TrendingUp, FileText, LogOut, User, Building2,
  CheckCircle2, Activity, ArrowLeft, Clock, ChevronRight, Heart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ReportFeedback from './ReportFeedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ClientData {
  id: string;
  name: string;
  industry?: string;
  contact_name?: string;
  contact_email?: string;
  health_score?: number;
  health_status?: string;
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getHealthLabel(score?: number) {
  if (!score && score !== 0) return { label: 'N/A', variant: 'secondary' as const };
  if (score >= 80) return { label: 'Excellent', variant: 'default' as const };
  if (score >= 60) return { label: 'Good', variant: 'default' as const };
  if (score >= 40) return { label: 'Needs Attention', variant: 'secondary' as const };
  return { label: 'At Risk', variant: 'destructive' as const };
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'on_track': return 'default';
      case 'needs_attention': return 'secondary';
      case 'delayed': return 'destructive';
      default: return 'outline';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-36 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-9 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-5 w-48 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!portalUser || !clientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Unable to load portal</h2>
            <p className="text-sm text-muted-foreground mb-6">We couldn't find your portal data. Please try again or contact support.</p>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredReports = filter === 'recent' ? reports.slice(0, 10) : reports;
  const approvedCount = reports.filter(r => r.approval_status === 'approved').length;
  const latestReport = reports[0];
  const healthInfo = getHealthLabel(clientData.health_score);

  if (selectedReport) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">ClientFlow Portal</h1>
                  <p className="text-xs text-muted-foreground">{clientData.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-up">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedReport(null)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-xl mb-2">
                    Week of {format(new Date(selectedReport.week_start_date), 'MMMM d, yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedReport.services && (
                      <Badge variant="outline">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {selectedReport.services.name}
                      </Badge>
                    )}
                    {selectedReport.profiles && (
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        {selectedReport.profiles.full_name}
                      </Badge>
                    )}
                    <Badge variant={getStatusBadgeVariant(selectedReport.status)}>
                      {formatStatus(selectedReport.status)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(new Date(selectedReport.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedReport.service_metrics && selectedReport.service_metrics.length > 0 && (
                <Card className="bg-muted/50 border-0">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Performance Metrics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(selectedReport.service_metrics[0].metric_data || {}).slice(0, 8).map(([key, value]) => (
                        <div key={key} className="bg-card rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-lg font-bold text-foreground">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedReport.work_summary && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Work Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedReport.work_summary}</p>
                </div>
              )}

              {selectedReport.key_wins && (
                <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-0">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Key Wins
                    </h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap">{selectedReport.key_wins}</p>
                  </CardContent>
                </Card>
              )}

              {selectedReport.challenges && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border-0">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Challenges
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400 whitespace-pre-wrap">{selectedReport.challenges}</p>
                  </CardContent>
                </Card>
              )}

              {selectedReport.next_week_plan && (
                <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 border-0">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Next Week's Plan
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">{selectedReport.next_week_plan}</p>
                  </CardContent>
                </Card>
              )}

              <div className="pt-4 border-t border-border">
                <ReportFeedback
                  reportId={selectedReport.id}
                  isClientPortal={true}
                  portalUserId={portalUser.id}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ClientFlow Portal</h1>
                <p className="text-xs text-muted-foreground">{clientData.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{portalUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{portalUser.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-fade-up">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {getGreeting()}, {portalUser.full_name.split(' ')[0]}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome to your {clientData.name} performance dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <Card className="stat-card-gradient blue">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Reports</span>
                <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{reports.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                approved reports available
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card-gradient green">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-sm font-medium text-muted-foreground">Approved Reports</span>
                <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{approvedCount}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                reviewed and approved
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card-gradient purple">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-sm font-medium text-muted-foreground">Latest Status</span>
                <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/30">
                  <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              {latestReport ? (
                <>
                  <Badge variant={getStatusBadgeVariant(latestReport.status)} className="text-sm px-3 py-1">
                    {formatStatus(latestReport.status)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(latestReport.week_start_date), 'MMM d, yyyy')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="stat-card-gradient orange">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-sm font-medium text-muted-foreground">Account Health</span>
                <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/30">
                  <Heart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {clientData.health_score ?? '—'}
              </p>
              <div className="mt-1.5">
                <Badge variant={healthInfo.variant} className="text-xs">
                  {healthInfo.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-lg font-semibold text-foreground">Weekly Reports</h3>
          <div className="flex gap-2">
            <Button
              variant={filter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('recent')}
            >
              Recent (10)
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Reports
            </Button>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-12 text-center">
              <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No reports available yet</h3>
              <p className="text-sm text-muted-foreground">Reports will appear here once they are approved by your account team.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
            {filteredReports.map((report, index) => (
              <Card
                key={report.id}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/20"
                style={{ animationDelay: `${300 + index * 50}ms` }}
                onClick={() => setSelectedReport(report)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/30 shrink-0">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate">
                          Week of {format(new Date(report.week_start_date), 'MMM d, yyyy')}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap ml-11">
                        <Badge variant={getStatusBadgeVariant(report.status)}>
                          {formatStatus(report.status)}
                        </Badge>
                        {report.services && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {report.services.name}
                          </Badge>
                        )}
                        {report.profiles && (
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {report.profiles.full_name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {format(new Date(report.created_at), 'MMM d')}
                        </span>
                      </div>
                      {report.work_summary && (
                        <p className="text-xs text-muted-foreground mt-2 ml-11 line-clamp-2">
                          {report.work_summary}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-muted-foreground">
            Powered by ClientFlow — Client Performance Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
