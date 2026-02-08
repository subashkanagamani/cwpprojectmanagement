import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, ClientAssignment, Profile, Service, WeeklyReport } from '../../lib/database.types';
import { ArrowLeft, Users, Plus, X, FileText, Calendar, DollarSign, Clock, Briefcase, Mail, Phone, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface ClientDetailPageProps {
  clientId: string;
  onBack: () => void;
}

interface AssignmentWithDetails extends ClientAssignment {
  employee?: Profile;
  service?: Service;
}

interface ReportWithDetails extends WeeklyReport {
  employee?: Profile;
  service?: Service;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getHealthVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'healthy': return 'default';
    case 'needs_attention': return 'secondary';
    case 'at_risk': return 'destructive';
    default: return 'outline';
  }
}

function getHealthLabel(status: string) {
  switch (status) {
    case 'healthy': return 'Healthy';
    case 'needs_attention': return 'Needs Attention';
    case 'at_risk': return 'At Risk';
    default: return status || 'Unknown';
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'active': return 'default';
    case 'paused': return 'secondary';
    case 'completed': return 'outline';
    default: return 'outline';
  }
}

function getReportStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'on_track': return 'default';
    case 'delayed': return 'destructive';
    case 'needs_attention': return 'secondary';
    default: return 'outline';
  }
}

export function ClientDetailPage({ clientId, onBack }: ClientDetailPageProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    employee_id: '',
    service_id: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      const [clientRes, assignmentsRes, reportsRes, employeesRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
        supabase
          .from('client_assignments')
          .select('*, profiles(*), services(*)')
          .eq('client_id', clientId),
        supabase
          .from('weekly_reports')
          .select('*, profiles(*), services(*)')
          .eq('client_id', clientId)
          .order('week_start_date', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'employee')
          .eq('status', 'active'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);

      if (clientRes.data) setClient(clientRes.data);

      if (assignmentsRes.data) {
        setAssignments(
          assignmentsRes.data.map((a) => ({
            ...a,
            employee: a.profiles,
            service: a.services,
          }))
        );
      }

      if (reportsRes.data) {
        setReports(
          reportsRes.data.map((r) => ({
            ...r,
            employee: r.profiles,
            service: r.services,
          }))
        );
      }

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading client data:', error);
      showToast('Failed to load client data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignFormData.employee_id || !assignFormData.service_id) {
      showToast('Please select both employee and service', 'error');
      return;
    }

    const existingAssignment = assignments.find(
      (a) =>
        a.employee_id === assignFormData.employee_id &&
        a.service_id === assignFormData.service_id
    );

    if (existingAssignment) {
      showToast('This employee is already assigned to this service', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('client_assignments').insert({
        client_id: clientId,
        employee_id: assignFormData.employee_id,
        service_id: assignFormData.service_id,
      });

      if (error) throw error;

      showToast('Employee assigned successfully', 'success');
      setShowAssignModal(false);
      setAssignFormData({ employee_id: '', service_id: '' });
      loadClientData();
    } catch (error) {
      console.error('Error assigning employee:', error);
      showToast('Failed to assign employee', 'error');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const { error } = await supabase
        .from('client_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      showToast('Assignment removed successfully', 'success');
      loadClientData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      showToast('Failed to remove assignment', 'error');
    }
  };

  const onTrackCount = reports.filter((r) => r.status === 'on_track').length;
  const needsAttentionCount = reports.filter((r) => r.status === 'needs_attention' || r.status === 'delayed').length;
  const uniqueServices = new Set(assignments.map(a => a.service?.name).filter(Boolean));

  if (loading) {
    return (
      <div className="space-y-6" data-testid="loading-client-detail">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Client not found</p>
          <Button variant="outline" onClick={onBack} data-testid="button-go-back-not-found">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-detail-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-to-clients">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-client-name">
                {client.name}
              </h1>
              <Badge variant={getStatusVariant(client.status)} data-testid="badge-client-status">
                {client.status}
              </Badge>
              <Badge variant={getHealthVariant(client.health_status)} data-testid="badge-client-health">
                {getHealthLabel(client.health_status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.industry || 'No industry'} {client.start_date && `\u00B7 Since ${format(new Date(client.start_date), 'MMM yyyy')}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAssignModal(true)} data-testid="button-assign-employee">
          <Plus className="h-4 w-4 mr-2" />
          Assign Employee
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-team-size">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Team Size</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{assignments.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{uniqueServices.size} service{uniqueServices.size !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-reports">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Total Reports</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{reports.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{onTrackCount} on track</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/40">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-on-track">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">On Track</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{onTrackCount}</p>
                {reports.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((onTrackCount / reports.length) * 100)}% rate
                  </p>
                )}
              </div>
              <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-attention">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Needs Attention</p>
                <p className="text-3xl font-semibold mt-1 tracking-tight">{needsAttentionCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">delayed or flagged</p>
              </div>
              <div className="rounded-lg p-2.5 bg-red-50 dark:bg-red-950/40">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(client.contact_name || client.contact_email || client.contact_phone || client.website) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {client.contact_name && (
                <div className="flex items-center gap-3" data-testid="text-contact-name">
                  <div className="rounded-md bg-muted p-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium truncate">{client.contact_name}</p>
                  </div>
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-center gap-3" data-testid="text-contact-email">
                  <div className="rounded-md bg-muted p-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{client.contact_email}</p>
                  </div>
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-center gap-3" data-testid="text-contact-phone">
                  <div className="rounded-md bg-muted p-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium truncate">{client.contact_phone}</p>
                  </div>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-3" data-testid="text-contact-website">
                  <div className="rounded-md bg-muted p-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-medium truncate">{client.website}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {client.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-client-notes">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-[15px] font-semibold">Assigned Team</CardTitle>
            <p className="text-xs text-muted-foreground">{assignments.length} member{assignments.length !== 1 ? 's' : ''}</p>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No employees assigned yet</p>
              <Button variant="outline" size="sm" onClick={() => setShowAssignModal(true)} data-testid="button-assign-first">
                <Plus className="h-4 w-4 mr-2" />
                Assign Employee
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignments.map((assignment, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div
                    key={assignment.id}
                    className="rounded-md border p-4 space-y-3"
                    data-testid={`card-assignment-${assignment.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className={`${color} text-white text-xs font-medium`}>
                            {assignment.employee ? getInitials(assignment.employee.full_name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-assignment-employee-${assignment.id}`}>
                            {assignment.employee?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {assignment.employee?.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        data-testid={`button-remove-assignment-${assignment.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-service-${assignment.id}`}>
                      {assignment.service?.name || 'No service'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-[15px] font-semibold">Work Reports</CardTitle>
            <p className="text-xs text-muted-foreground">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports submitted yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{format(new Date(report.week_start_date), 'MMM d, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium" data-testid={`text-report-employee-${report.id}`}>
                        {report.employee?.full_name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{report.service?.name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getReportStatusVariant(report.status)} data-testid={`badge-report-status-${report.id}`}>
                        {report.status?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {report.work_summary || 'No summary provided'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent data-testid="dialog-assign-employee">
          <DialogHeader>
            <DialogTitle>Assign Employee to {client.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignEmployee} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={assignFormData.employee_id}
                onValueChange={(value) => setAssignFormData({ ...assignFormData, employee_id: value })}
              >
                <SelectTrigger data-testid="select-assign-employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={assignFormData.service_id}
                onValueChange={(value) => setAssignFormData({ ...assignFormData, service_id: value })}
              >
                <SelectTrigger data-testid="select-assign-service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)} data-testid="button-cancel-assign">
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-assign">
                Assign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
