import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Profile, Service, ClientAssignment } from '../../lib/database.types';
import { Plus, X, Trash2, Users, Building2, Briefcase, UserCheck, Filter, Search, Crown } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  employee?: Profile;
  service?: Service;
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
];

function getAvatarColor(name: string | undefined | null): string {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function AssignmentsPage() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    employee_ids: [] as string[],
    service_id: '',
    account_manager_id: '' as string,
  });
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsRes, clientsRes, employeesRes, servicesRes] = await Promise.all([
        supabase.from('client_assignments').select(`
          *,
          clients(*),
          profiles(*),
          services(*)
        `),
        supabase.from('clients').select('*').eq('status', 'active'),
        supabase.from('profiles').select('*').eq('status', 'active').eq('role', 'employee'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);

      if (assignmentsRes.data) {
        const assignmentsWithDetails = assignmentsRes.data.map((assignment: any) => ({
          ...assignment,
          client: assignment.clients,
          employee: assignment.profiles,
          service: assignment.services,
        }));
        setAssignments(assignmentsWithDetails);
      }

      if (clientsRes.data) setClients(clientsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.employee_ids.length === 0) {
      showToast('warning', 'Please select at least one employee');
      return;
    }

    try {
      const { data: clientService } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', formData.client_id)
        .eq('service_id', formData.service_id)
        .maybeSingle();

      if (!clientService) {
        showToast('error', 'This service is not enabled for this client. Please enable it in the client settings first.');
        return;
      }

      const newAssignments = formData.employee_ids.map(employee_id => ({
        client_id: formData.client_id,
        employee_id: employee_id,
        service_id: formData.service_id,
        is_account_manager: employee_id === formData.account_manager_id,
      }));

      const { error } = await supabase.from('client_assignments').insert(newAssignments as any);

      if (error) {
        if (error.code === '23505') {
          showToast('error', 'One or more assignments already exist');
        } else {
          throw error;
        }
        return;
      }

      setShowModal(false);
      setFormData({ client_id: '', employee_ids: [], service_id: '', account_manager_id: '' });
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('error', 'Failed to create assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const { error } = await supabase.from('client_assignments').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const toggleAccountManager = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('client_assignments')
        .update({ is_account_manager: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showToast(!currentStatus ? 'Set as account manager' : 'Removed as account manager', 'success');
      loadData();
    } catch (error) {
      console.error('Error toggling account manager:', error);
      showToast('Failed to update account manager status', 'error');
    }
  };

  let filteredAssignments = assignments;
  if (selectedClient !== 'all') {
    filteredAssignments = filteredAssignments.filter((a) => a.client_id === selectedClient);
  }
  if (selectedEmployee !== 'all') {
    filteredAssignments = filteredAssignments.filter((a) => a.employee_id === selectedEmployee);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredAssignments = filteredAssignments.filter(
      (a) =>
        a.client?.name?.toLowerCase().includes(q) ||
        a.employee?.full_name?.toLowerCase().includes(q) ||
        a.service?.name?.toLowerCase().includes(q)
    );
  }

  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    const clientId = assignment.client_id;
    if (!acc[clientId]) {
      acc[clientId] = [];
    }
    acc[clientId].push(assignment);
    return acc;
  }, {} as Record<string, AssignmentWithDetails[]>);

  const uniqueClients = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.client_id));
    return ids.size;
  }, [assignments]);

  const uniqueEmployees = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.employee_id));
    return ids.size;
  }, [assignments]);

  const uniqueServices = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.service_id));
    return ids.size;
  }, [assignments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="assignments-page">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-page-title">Assignments</h1>
          <p className="text-sm text-muted-foreground">Manage which team members work on each client account</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="button-new-assignment">
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-assignments">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Assignments</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{assignments.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-clients">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Clients Covered</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{uniqueClients}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/40">
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-assigned-employees">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Team Members</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{uniqueEmployees}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/40">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-services-used">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Services Active</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{uniqueServices}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients, employees, or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-assignments"
              />
            </div>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-client">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-employee">
                <Users className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.entries(groupedAssignments).map(([clientId, clientAssignments]) => {
          const client = clientAssignments[0]?.client;
          if (!client) return null;

          const serviceGroups = clientAssignments.reduce((acc, a) => {
            const serviceId = a.service_id;
            if (!acc[serviceId]) {
              acc[serviceId] = { service: a.service, members: [] };
            }
            acc[serviceId].members.push(a);
            return acc;
          }, {} as Record<string, { service?: Service; members: AssignmentWithDetails[] }>);

          return (
            <Card key={clientId} data-testid={`card-client-${clientId}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2.5 bg-muted">
                      <Building2 className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base" data-testid={`text-client-name-${clientId}`}>{client.name}</CardTitle>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="no-default-active-elevate" data-testid={`badge-member-count-${clientId}`}>
                    {clientAssignments.length} {clientAssignments.length === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {Object.entries(serviceGroups).map(([serviceId, group]) => (
                    <div key={serviceId}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground" data-testid={`text-service-${serviceId}`}>
                          {group.service?.name || 'Unknown Service'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {group.members.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                            data-testid={`row-assignment-${assignment.id}`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className={`text-xs font-medium ${getAvatarColor(assignment.employee?.full_name)}`}>
                                  {getInitials(assignment.employee?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-foreground truncate" data-testid={`text-employee-name-${assignment.id}`}>
                                    {assignment.employee?.full_name}
                                  </p>
                                  {assignment.is_account_manager && (
                                    <Badge variant="default" className="bg-amber-600 dark:bg-amber-700 text-xs px-1.5 py-0">
                                      <Crown className="h-3 w-3 mr-0.5" />
                                      Manager
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {assignment.employee?.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleAccountManager(assignment.id, assignment.is_account_manager || false)}
                                title={assignment.is_account_manager ? 'Remove as account manager' : 'Set as account manager'}
                                data-testid={`button-toggle-manager-${assignment.id}`}
                              >
                                <Crown className={`h-4 w-4 ${assignment.is_account_manager ? 'text-amber-600' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(assignment.id)}
                                data-testid={`button-delete-assignment-${assignment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {Object.keys(groupedAssignments).length === 0 && (
          <Card data-testid="assignments-empty">
            <CardContent className="py-16 text-center">
              <div className="rounded-full p-4 bg-muted/50 w-fit mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No assignments found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || selectedClient !== 'all' || selectedEmployee !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first assignment to connect team members with clients'}
              </p>
              {(searchQuery || selectedClient !== 'all' || selectedEmployee !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedClient('all');
                    setSelectedEmployee('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Assignment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger data-testid="select-assignment-client">
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

            <div className="space-y-2">
              <Label>Team Members ({formData.employee_ids.length} selected)</Label>
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto bg-background">
                <div className="space-y-1">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate"
                    >
                      <Checkbox
                        checked={formData.employee_ids.includes(employee.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              employee_ids: [...formData.employee_ids, employee.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              employee_ids: formData.employee_ids.filter(id => id !== employee.id)
                            });
                          }
                        }}
                        data-testid={`checkbox-employee-${employee.id}`}
                      />
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className={`text-[10px] font-medium ${getAvatarColor(employee.full_name)}`}>
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{employee.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{employee.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {formData.employee_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.employee_ids.map((employeeId) => {
                    const employee = employees.find(e => e.id === employeeId);
                    return (
                      <Badge key={employeeId} variant="secondary" className="gap-1">
                        {employee?.full_name}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              employee_ids: formData.employee_ids.filter(id => id !== employeeId)
                            });
                          }}
                          data-testid={`button-remove-employee-${employeeId}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {formData.employee_ids.length > 0 && (
              <div className="space-y-2">
                <Label>Account Manager (Optional)</Label>
                <Select
                  value={formData.account_manager_id}
                  onValueChange={(value) => setFormData({ ...formData, account_manager_id: value })}
                >
                  <SelectTrigger data-testid="select-account-manager">
                    <SelectValue placeholder="Select account manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {formData.employee_ids.map((employeeId) => {
                      const employee = employees.find(e => e.id === employeeId);
                      return (
                        <SelectItem key={employeeId} value={employeeId}>
                          {employee?.full_name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Account managers can track progress of all team members on this client
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Service / Role</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => setFormData({ ...formData, service_id: value })}
              >
                <SelectTrigger data-testid="select-assignment-service">
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-assignment"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-create-assignment">
                Create Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
