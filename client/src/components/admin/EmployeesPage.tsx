import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, Client, ClientAssignment, Service } from '../../lib/database.types';
import { Plus, Edit2, X, CheckCircle, XCircle, Search, Briefcase, Users, UserCheck, AlertTriangle, BarChart3 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface EmployeeWithDetails extends Profile {
  assignmentCount?: number;
  assignments?: Array<ClientAssignment & { client?: Client; service?: Service }>;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
  'bg-pink-600', 'bg-orange-600',
];

const SKILL_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300' },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getCapacityPercentage(count: number, capacity: number) {
  if (capacity <= 0) return 0;
  return Math.min(Math.round((count / capacity) * 100), 100);
}

function getWorkloadBadge(count: number, capacity: number) {
  const pct = getCapacityPercentage(count, capacity);
  if (pct >= 75) return { label: 'High', variant: 'destructive' as const };
  if (pct >= 50) return { label: 'Medium', variant: 'default' as const };
  return { label: 'Low', variant: 'secondary' as const };
}

export function EmployeesPage() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee' as 'admin' | 'employee',
    status: 'active' as 'active' | 'inactive',
    phone: '',
    max_capacity: '5',
    skills: [] as string[],
    manager_id: null as string | null,
  });
  const [assignFormData, setAssignFormData] = useState({
    client_id: '',
    service_id: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const [employeesRes, clientsRes, servicesRes, assignmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').eq('status', 'active'),
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('client_assignments').select('*, clients(*), services(*)'),
      ]);

      if (employeesRes.data) {
        const employeesWithDetails = employeesRes.data.map(employee => {
          const employeeAssignments = assignmentsRes.data?.filter(a => a.employee_id === employee.id) || [];
          return {
            ...employee,
            assignmentCount: employeeAssignments.length,
            assignments: employeeAssignments.map(a => ({
              ...a,
              client: a.clients,
              service: a.services,
            })),
          };
        });
        setEmployees(employeesWithDetails);
      }
      if (clientsRes.data) setClients(clientsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (employee?: Profile) => {
    if (employee) {
      setEditingEmployee(employee);
      const skillsArray = Array.isArray(employee.skills) ? employee.skills : [];
      setFormData({
        email: employee.email,
        password: '',
        full_name: employee.full_name,
        role: employee.role,
        status: employee.status,
        phone: employee.phone || '',
        max_capacity: employee.max_capacity?.toString() || '5',
        skills: skillsArray,
        manager_id: employee.manager_id || null,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'employee',
        status: 'active',
        phone: '',
        max_capacity: '5',
        skills: [],
        manager_id: null,
      });
    }
    setShowModal(true);
  };

  const openAssignModal = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setAssignFormData({ client_id: '', service_id: '' });
    setShowAssignModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('profiles')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            status: formData.status,
            phone: formData.phone || null,
            max_capacity: parseInt(formData.max_capacity),
            skills: formData.skills,
            manager_id: formData.manager_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            status: formData.status,
            phone: formData.phone || null,
            max_capacity: parseInt(formData.max_capacity),
            skills: formData.skills,
            manager_id: formData.manager_id || null,
          });

          if (profileError) throw profileError;
        }
      }

      setShowModal(false);
      loadEmployees();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      showToast(error.message || 'Failed to save employee', 'error');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const { data: clientServices } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', assignFormData.client_id)
        .eq('service_id', assignFormData.service_id)
        .maybeSingle();

      if (!clientServices) {
        showToast('This service is not enabled for this client. Please enable it first.', 'error');
        return;
      }

      const { error } = await supabase.from('client_assignments').insert({
        client_id: assignFormData.client_id,
        employee_id: selectedEmployee.id,
        service_id: assignFormData.service_id,
      });

      if (error) {
        if (error.code === '23505') {
          showToast('This employee is already assigned to this service for this client', 'error');
        } else {
          throw error;
        }
        return;
      }

      setShowAssignModal(false);
      loadEmployees();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create assignment', 'error');
    }
  };

  const toggleStatus = async (employee: Profile) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', employee.id);

      if (error) throw error;
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const getWorkloadColor = (count: number, capacity: number) => {
    const percentage = (count / capacity) * 100;
    if (percentage >= 100) return 'text-red-600 font-semibold';
    if (percentage >= 75) return 'text-orange-600 font-semibold';
    if (percentage >= 50) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  const getWorkloadLabel = (count: number, capacity: number) => {
    const percentage = (count / capacity) * 100;
    if (percentage >= 100) return 'At Capacity';
    if (percentage >= 75) return 'Heavy Load';
    if (percentage >= 50) return 'Moderate';
    return 'Light Load';
  };

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const highWorkload = employees.filter(e => {
      const count = e.assignmentCount || 0;
      const cap = e.max_capacity || 5;
      return count >= cap * 0.75;
    }).length;
    const avgCapacity = total > 0
      ? Math.round(employees.reduce((sum, e) => {
          const count = e.assignmentCount || 0;
          const cap = e.max_capacity || 5;
          return sum + getCapacityPercentage(count, cap);
        }, 0) / total)
      : 0;
    return { total, active, highWorkload, avgCapacity };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(employee.skills) && employee.skills.some((skill: string) =>
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchTerm, roleFilter, statusFilter]);

  const statCards = [
    {
      label: 'Total Team Members',
      value: stats.total,
      sub: `${stats.active} active`,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Active Members',
      value: stats.active,
      sub: `${stats.total - stats.active} inactive`,
      icon: UserCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'High Workload',
      value: stats.highWorkload,
      sub: 'at 75%+ capacity',
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
    },
    {
      label: 'Avg Capacity Used',
      value: `${stats.avgCapacity}%`,
      sub: 'across all members',
      icon: BarChart3,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6" data-testid="employees-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-employees-title">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage team members, skills, and assignments</p>
        </div>
        <Button onClick={() => openModal()} data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-semibold mt-2 tracking-tight" data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search employees by name, email, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-employees"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1" data-testid="filter-role-group">
            <Button
              variant={roleFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('all')}
              data-testid="button-filter-role-all"
              className={roleFilter === 'all' ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            >
              All
            </Button>
            <Button
              variant={roleFilter === 'employee' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('employee')}
              data-testid="button-filter-role-employee"
              className={roleFilter === 'employee' ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            >
              Employees
            </Button>
            <Button
              variant={roleFilter === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('admin')}
              data-testid="button-filter-role-admin"
              className={roleFilter === 'admin' ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            >
              Admins
            </Button>
          </div>
          <div className="flex items-center gap-1" data-testid="filter-status-group">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              data-testid="button-filter-status-all"
              className={statusFilter === 'all' ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
              data-testid="button-filter-status-active"
              className={statusFilter === 'active' ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('inactive')}
              data-testid="button-filter-status-inactive"
              className={statusFilter === 'inactive' ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            >
              Inactive
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Workload</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee, index) => {
                const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                const capacityPct = getCapacityPercentage(employee.assignmentCount || 0, employee.max_capacity || 5);
                const workload = getWorkloadBadge(employee.assignmentCount || 0, employee.max_capacity || 5);
                const skills = Array.isArray(employee.skills) ? employee.skills : [];

                return (
                  <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar data-testid={`avatar-employee-${employee.id}`}>
                          <AvatarFallback className={`${avatarColor} text-white text-xs font-medium`}>
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground" data-testid={`text-employee-name-${employee.id}`}>{employee.full_name}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1" data-testid={`skills-employee-${employee.id}`}>
                        {skills.length > 0 ? (
                          <>
                            {skills.slice(0, 3).map((skill: string, idx: number) => {
                              const skillColor = SKILL_COLORS[idx % SKILL_COLORS.length];
                              return (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className={`text-xs ${skillColor.bg} ${skillColor.text}`}
                                  data-testid={`badge-skill-${employee.id}-${idx}`}
                                >
                                  {skill}
                                </Badge>
                              );
                            })}
                            {skills.length > 3 && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-skills-more-${employee.id}`}>
                                +{skills.length - 3} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No skills</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.role === 'admin' ? 'destructive' : 'default'} className="text-xs" data-testid={`badge-role-${employee.id}`}>
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5 min-w-[120px]" data-testid={`workload-employee-${employee.id}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">{employee.assignmentCount || 0}/{employee.max_capacity}</span>
                          <Badge variant={workload.variant} className="text-xs" data-testid={`badge-workload-${employee.id}`}>
                            {workload.label}
                          </Badge>
                        </div>
                        <Progress value={capacityPct} className="h-1.5" data-testid={`progress-workload-${employee.id}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssignModal(employee)}
                        data-testid={`button-view-assignments-${employee.id}`}
                      >
                        <Briefcase className="h-4 w-4 mr-1" />
                        View ({employee.assignmentCount || 0})
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(employee)}
                        data-testid={`button-toggle-status-${employee.id}`}
                      >
                        {employee.status === 'active' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-sm text-green-600 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-muted-foreground mr-1" />
                            <span className="text-sm text-muted-foreground font-medium">Inactive</span>
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openModal(employee)}
                        data-testid={`button-edit-employee-${employee.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground" data-testid="text-no-employees">
                    {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'No employees match your filters.'
                      : 'No employees yet. Add your first team member to get started.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                data-testid="input-employee-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingEmployee}
                  data-testid="input-employee-email"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-employee-phone"
                />
              </div>
            </div>

            {!editingEmployee && (
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="input-employee-password"
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'employee' })}
                >
                  <SelectTrigger data-testid="select-employee-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}
                >
                  <SelectTrigger data-testid="select-employee-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Capacity</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                  data-testid="input-employee-capacity"
                />
              </div>
            </div>

            <div>
              <Label>Manager (Optional)</Label>
              <Select
                value={formData.manager_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, manager_id: value === 'none' ? null : value })}
              >
                <SelectTrigger data-testid="select-employee-manager">
                  <SelectValue placeholder="No manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {employees
                    .filter(emp => emp.role === 'admin' || emp.role === 'employee')
                    .filter(emp => emp.id !== editingEmployee?.id)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Assign a manager to this employee for reporting hierarchy</p>
            </div>

            <div>
              <Label>Skills</Label>
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto bg-background">
                <div className="space-y-2">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate"
                    >
                      <Checkbox
                        checked={formData.skills.includes(service.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            addSkill(service.name);
                          } else {
                            removeSkill(service.name);
                          }
                        }}
                        data-testid={`checkbox-skill-${service.id}`}
                      />
                      <span className="text-sm text-foreground">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formData.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        data-testid={`button-remove-skill-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-employee"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-employee">
                {editingEmployee ? 'Update Employee' : 'Create Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignModal && !!selectedEmployee} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assignments for {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                <h3 className="text-sm font-semibold text-foreground">Current Assignments</h3>
                <span className={`text-sm ${getWorkloadColor(selectedEmployee?.assignmentCount || 0, selectedEmployee?.max_capacity || 5)}`}>
                  {selectedEmployee?.assignmentCount || 0} / {selectedEmployee?.max_capacity} capacity
                </span>
              </div>
              {selectedEmployee?.assignments && selectedEmployee.assignments.length > 0 ? (
                <div className="space-y-2">
                  {selectedEmployee.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 flex-wrap p-3 bg-muted rounded-md">
                      <div>
                        <p className="text-sm font-medium text-foreground">{assignment.client?.name}</p>
                        <p className="text-xs text-muted-foreground">{assignment.service?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assign New Client</h3>
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select
                    value={assignFormData.client_id}
                    onValueChange={(value) => setAssignFormData({ ...assignFormData, client_id: value })}
                  >
                    <SelectTrigger data-testid="select-assign-client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
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
                  <p className="text-xs text-muted-foreground mt-1">Only services enabled for the client will be accepted</p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAssignModal(false)}
                    data-testid="button-close-assign"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    disabled={(selectedEmployee?.assignmentCount || 0) >= (selectedEmployee?.max_capacity || 5)}
                    data-testid="button-assign-client"
                  >
                    Assign Client
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
