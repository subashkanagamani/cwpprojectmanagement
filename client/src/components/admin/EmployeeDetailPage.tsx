import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, Shield, Activity, Clock, CheckCircle, XCircle, CreditCard as Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface Props {
  employeeId: string;
  onBack: () => void;
}

interface EmployeeDetail {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive';
  skills: string[];
  max_capacity: number;
  phone: string | null;
  manager_id: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  client_id: string;
  service_id: string;
  status: string;
  allocated_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  clients: { name: string; status: string } | null;
  services: { name: string } | null;
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  is_billable: boolean;
  clients: { name: string } | null;
  services: { name: string } | null;
}

interface Stats {
  totalAssignments: number;
  activeAssignments: number;
  totalHoursThisMonth: number;
  billableHoursThisMonth: number;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-teal-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function EmployeeDetailPage({ employeeId, onBack }: Props) {
  const { showToast } = useToast();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ totalAssignments: 0, activeAssignments: 0, totalHoursThisMonth: 0, billableHoursThisMonth: 0 });
  const [manager, setManager] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const [empRes, assignRes, entriesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', employeeId).single(),
        supabase
          .from('client_assignments')
          .select('*, clients(name, status), services(name)')
          .eq('employee_id', employeeId)
          .is('deleted_at', null)
          .order('start_date', { ascending: false }),
        supabase
          .from('time_entries')
          .select('*, clients(name), services(name)')
          .eq('employee_id', employeeId)
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
          .order('date', { ascending: false }),
      ]);

      if (empRes.error) throw empRes.error;
      setEmployee(empRes.data);

      const assignData: Assignment[] = assignRes.data || [];
      setAssignments(assignData);

      const entryData: TimeEntry[] = entriesRes.data || [];
      setRecentEntries(entryData);

      const totalHours = entryData.reduce((s, e) => s + e.hours, 0);
      const billableHours = entryData.filter(e => e.is_billable).reduce((s, e) => s + e.hours, 0);

      setStats({
        totalAssignments: assignData.length,
        activeAssignments: assignData.filter(a => a.status === 'active').length,
        totalHoursThisMonth: totalHours,
        billableHoursThisMonth: billableHours,
      });

      if (empRes.data.manager_id) {
        const { data: mgr } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', empRes.data.manager_id)
          .single();
        setManager(mgr?.full_name || null);
      }
    } catch {
      showToast('Failed to load employee details', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="text-muted-foreground">Employee not found.</p>
      </div>
    );
  }

  const skills = Array.isArray(employee.skills) ? employee.skills as string[] : [];
  const avatarColor = getAvatarColor(employee.full_name);
  const capacityPct = stats.activeAssignments > 0
    ? Math.min(100, Math.round((stats.activeAssignments / employee.max_capacity) * 100))
    : 0;

  const statCards = [
    {
      label: 'Active Assignments',
      value: stats.activeAssignments,
      sub: `${stats.totalAssignments} total`,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Hours This Month',
      value: stats.totalHoursThisMonth.toFixed(1),
      sub: 'logged hours',
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      label: 'Billable Hours',
      value: stats.billableHoursThisMonth.toFixed(1),
      sub: stats.totalHoursThisMonth > 0
        ? `${Math.round((stats.billableHoursThisMonth / stats.totalHoursThisMonth) * 100)}% of total`
        : 'this month',
      icon: Activity,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      label: 'Capacity Used',
      value: `${capacityPct}%`,
      sub: `max ${employee.max_capacity} assignments`,
      icon: Shield,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-1" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar className={`h-16 w-16 ${avatarColor} shrink-0`}>
            <AvatarFallback className="text-xl font-semibold text-white bg-transparent">
              {initials(employee.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{employee.full_name}</h1>
              <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className="no-default-active-elevate">
                {employee.status === 'active' ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" />Inactive</>
                )}
              </Badge>
              <Badge variant="outline" className="no-default-active-elevate capitalize">
                {employee.role}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{employee.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Member since {format(new Date(employee.created_at), 'MMMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ animationDelay: '50ms' }}>
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`p-2.5 rounded-lg ${bg} shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ animationDelay: '100ms' }}>
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground break-all">{employee.email}</p>
              </div>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">{employee.phone}</p>
                </div>
              </div>
            )}
            {manager && (
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Manager</p>
                  <p className="font-medium text-foreground">{manager}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium text-foreground">{format(new Date(employee.created_at), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground mb-2">Capacity</p>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-foreground font-medium">{stats.activeAssignments} active</span>
                <span className="text-muted-foreground">max {employee.max_capacity}</span>
              </div>
              <Progress value={capacityPct} className="h-2" />
            </div>

            {skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs no-default-active-elevate">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Client Assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {assignments.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="h-8 w-8 opacity-30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-foreground">
                        {a.clients?.name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.services?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.status === 'active' ? 'default' : 'secondary'}
                          className="capitalize no-default-active-elevate"
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {a.allocated_hours != null ? `${a.allocated_hours}h` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time Entries This Month</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentEntries.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="h-8 w-8 opacity-30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No time entries this month</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Billable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.date), 'MMM dd')}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {entry.clients?.name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.services?.name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {entry.hours}h
                      </TableCell>
                      <TableCell>
                        {entry.is_billable && (
                          <Badge variant="secondary" className="no-default-active-elevate">
                            Billable
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
