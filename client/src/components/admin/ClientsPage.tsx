import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabase';
import { Client, Service, Profile, ClientAssignment } from '../../lib/database.types';
import { Plus, Edit2, Trash2, Users, Search, DollarSign, AlertCircle, Eye, X, Briefcase, Activity, UserCheck } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ClientHealthIndicator } from '../ClientHealthIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ClientWithDetails extends Client {
  assignmentCount?: number;
  assignments?: Array<ClientAssignment & { employee?: Profile; service?: Service }>;
  totalBudget?: number;
}

interface ClientsPageProps {
  onViewClient?: (clientId: string) => void;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
  'bg-pink-600', 'bg-orange-600',
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function ClientsPage({ onViewClient }: ClientsPageProps = {}) {
  const { showToast } = useToast();
  const [, setLocation] = useLocation();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    status: 'active' as 'active' | 'paused' | 'completed',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    health_status: 'healthy' as 'healthy' | 'needs_attention' | 'at_risk',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    weekly_meeting_day: '' as string,
    meeting_time: '10:00',
    selectedServices: [] as string[],
    selectedEmployees: [] as { employee_id: string, service_id: string }[],
  });
  const [assignFormData, setAssignFormData] = useState({
    employee_ids: [] as string[],
    service_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, servicesRes, employeesRes, assignmentsRes, budgetsRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('profiles').select('*').eq('role', 'employee').eq('status', 'active'),
        supabase.from('client_assignments').select('*, profiles(*), services(*)'),
        supabase.from('client_budgets').select('client_id, monthly_budget'),
      ]);

      if (clientsRes.data) {
        const clientsWithDetails = clientsRes.data.map(client => {
          const clientAssignments = assignmentsRes.data?.filter(a => a.client_id === client.id) || [];
          const clientBudgets = budgetsRes.data?.filter(b => b.client_id === client.id) || [];
          const totalBudget = clientBudgets.reduce((sum, b) => sum + Number(b.monthly_budget), 0);

          return {
            ...client,
            assignmentCount: clientAssignments.length,
            assignments: clientAssignments.map(a => ({
              ...a,
              employee: a.profiles,
              service: a.services,
            })),
            totalBudget,
          };
        });
        setClients(clientsWithDetails);
      }
      if (servicesRes.data) setServices(servicesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const needsAttention = clients.filter(c => c.health_status === 'needs_attention' || c.health_status === 'at_risk').length;
    const totalBudget = clients.reduce((sum, c) => sum + (c.totalBudget || 0), 0);
    return { totalClients, activeClients, needsAttention, totalBudget };
  }, [clients]);

  const statCards = [
    {
      label: 'Total Clients',
      value: stats.totalClients,
      sub: `${stats.activeClients} active`,
      icon: Briefcase,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Active Clients',
      value: stats.activeClients,
      sub: `of ${stats.totalClients} total`,
      icon: UserCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Needs Attention',
      value: stats.needsAttention,
      sub: 'at risk or flagged',
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Monthly Budget',
      value: formatCurrency(stats.totalBudget),
      sub: 'total across clients',
      icon: DollarSign,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
  ];

  const openModal = async (client?: Client) => {
    if (client) {
      setEditingClient(client);
      const [{ data: clientServices }, { data: clientAssignments }] = await Promise.all([
        supabase.from('client_services').select('service_id').eq('client_id', client.id),
        supabase.from('client_assignments').select('employee_id, service_id').eq('client_id', client.id),
      ]);

      setFormData({
        name: client.name,
        industry: client.industry || '',
        status: client.status,
        priority: client.priority,
        health_status: client.health_status,
        start_date: client.start_date,
        notes: client.notes || '',
        contact_name: client.contact_name || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        website: client.website || '',
        weekly_meeting_day: client.weekly_meeting_day?.toString() || '',
        meeting_time: client.meeting_time || '10:00',
        selectedServices: clientServices?.map((cs) => cs.service_id) || [],
        selectedEmployees: clientAssignments || [],
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        industry: '',
        status: 'active',
        priority: 'medium',
        health_status: 'healthy',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        weekly_meeting_day: '',
        meeting_time: '10:00',
        selectedServices: [],
        selectedEmployees: [],
      });
    }
    setShowModal(true);
  };

  const openAssignModal = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setAssignFormData({ employee_ids: [], service_id: '' });
    setShowAssignModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const incompleteAssignments = formData.selectedEmployees.filter(emp => !emp.service_id);
    if (incompleteAssignments.length > 0) {
      showToast('Please assign a role/service to all selected employees before saving', 'error');
      return;
    }

    try {
      const clientData = {
        name: formData.name,
        industry: formData.industry || null,
        status: formData.status,
        priority: formData.priority,
        health_status: formData.health_status,
        start_date: formData.start_date,
        notes: formData.notes || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website: formData.website || null,
        weekly_meeting_day: formData.weekly_meeting_day ? parseInt(formData.weekly_meeting_day) : null,
        meeting_time: formData.meeting_time || null,
        updated_at: new Date().toISOString(),
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;

        await Promise.all([
          supabase.from('client_services').delete().eq('client_id', editingClient.id),
          supabase.from('client_assignments').delete().eq('client_id', editingClient.id),
        ]);

        if (formData.selectedServices.length > 0) {
          const clientServices = formData.selectedServices.map((serviceId) => ({
            client_id: editingClient.id,
            service_id: serviceId,
          }));
          await supabase.from('client_services').insert(clientServices);
        }

        if (formData.selectedEmployees.length > 0) {
          const assignments = formData.selectedEmployees.map((emp) => ({
            client_id: editingClient.id,
            employee_id: emp.employee_id,
            service_id: emp.service_id,
          }));
          await supabase.from('client_assignments').insert(assignments);
        }
      } else {
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;

        if (newClient) {
          if (formData.selectedServices.length > 0) {
            const clientServices = formData.selectedServices.map((serviceId) => ({
              client_id: newClient.id,
              service_id: serviceId,
            }));
            await supabase.from('client_services').insert(clientServices);
          }

          if (formData.selectedEmployees.length > 0) {
            const assignments = formData.selectedEmployees.map((emp) => ({
              client_id: newClient.id,
              employee_id: emp.employee_id,
              service_id: emp.service_id,
            }));
            await supabase.from('client_assignments').insert(assignments);
          }
        }
      }

      setShowModal(false);
      showToast(editingClient ? 'Client updated successfully' : 'Client created successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Failed to save client', 'error');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    if (assignFormData.employee_ids.length === 0) {
      showToast('Please select at least one employee', 'error');
      return;
    }

    try {
      const { data: clientServices } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', selectedClient.id)
        .eq('service_id', assignFormData.service_id)
        .maybeSingle();

      if (!clientServices) {
        showToast('This service is not enabled for this client. Please enable it first.', 'error');
        return;
      }

      const assignments = assignFormData.employee_ids.map(employee_id => ({
        client_id: selectedClient.id,
        employee_id: employee_id,
        service_id: assignFormData.service_id,
      }));

      const { error } = await supabase.from('client_assignments').insert(assignments);

      if (error) {
        if (error.code === '23505') {
          showToast('One or more employees are already assigned to this service for this client', 'error');
        } else {
          throw error;
        }
        return;
      }

      setShowAssignModal(false);
      showToast('Team members assigned successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create assignment', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also remove all related assignments and data.')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.contact_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const statusFilterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'active' as const, label: 'Active' },
    { value: 'paused' as const, label: 'Paused' },
    { value: 'completed' as const, label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="space-y-6" data-testid="loading-skeleton">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-9 w-full" />
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client accounts and team assignments</p>
        </div>
        <Button
          onClick={() => openModal()}
          data-testid="button-add-client"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
            >
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search clients by name, industry, or contact..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="input-search-clients"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="filter-status-tabs">
        {statusFilterOptions.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(option.value)}
            className={statusFilter === option.value ? 'toggle-elevate toggle-elevated' : 'toggle-elevate'}
            data-testid={`button-filter-${option.value}`}
          >
            {option.label}
            {option.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                {clients.filter(c => c.status === option.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {clients.length === 0 ? (
        <Card data-testid="empty-state">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="rounded-lg bg-muted p-4 mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-title">No clients yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Get started by adding your first client. You can manage their details, assign team members, and track budgets.
            </p>
            <Button onClick={() => openModal()} data-testid="button-empty-add-client">
              <Plus className="h-4 w-4" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, index) => (
                  <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar data-testid={`avatar-client-${client.id}`}>
                          <AvatarFallback className={`${AVATAR_COLORS[index % AVATAR_COLORS.length]} text-white text-xs font-medium`}>
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Button
                            variant="ghost"
                            className="p-0 h-auto text-sm font-medium text-foreground text-left"
                            onClick={() => setLocation(`/clients/${client.id}`)}
                            data-testid={`link-client-name-${client.id}`}
                          >
                            {client.name}
                          </Button>
                          <div className="text-xs text-muted-foreground">{client.industry || 'No industry'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.contact_name ? (
                        <div>
                          <div className="text-sm text-foreground" data-testid={`text-contact-name-${client.id}`}>{client.contact_name}</div>
                          <div className="text-xs text-muted-foreground">{client.contact_email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No contact</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(client.status)} data-testid={`badge-status-${client.id}`}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(client.priority)} data-testid={`badge-priority-${client.id}`}>
                        {client.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ClientHealthIndicator
                        healthStatus={client.health_status}
                        healthScore={client.health_score}
                        showScore={true}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssignModal(client)}
                        data-testid={`button-team-${client.id}`}
                      >
                        <Users className="h-4 w-4" />
                        <span>{client.assignmentCount || 0}</span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground" data-testid={`text-budget-${client.id}`}>
                        {formatCurrency(client.totalBudget || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {onViewClient && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewClient(client.id)}
                            title="View Details"
                            data-testid={`button-view-${client.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openModal(client)}
                          title="Edit"
                          data-testid={`button-edit-${client.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(client.id)}
                          title="Delete"
                          data-testid={`button-delete-${client.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground" data-testid="text-no-results">
                          {searchTerm || statusFilter !== 'all'
                            ? 'No clients match your current filters.'
                            : 'No clients yet. Add your first client to get started.'}
                        </p>
                        {(searchTerm || statusFilter !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                            data-testid="button-clear-filters"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input
                  id="client-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-industry">Industry</Label>
                <Input
                  id="client-industry"
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  data-testid="input-client-industry"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact Name</Label>
                  <Input
                    id="contact-name"
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    data-testid="input-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    data-testid="input-contact-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-website">Website</Label>
                  <Input
                    id="client-website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    data-testid="input-client-website"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Health Status</Label>
                <Select
                  value={formData.health_status}
                  onValueChange={(value) => setFormData({ ...formData, health_status: value as any })}
                >
                  <SelectTrigger data-testid="select-health-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="needs_attention">Needs Attention</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Weekly Meeting Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meeting Day</Label>
                  <Select
                    value={formData.weekly_meeting_day}
                    onValueChange={(value) => setFormData({ ...formData, weekly_meeting_day: value === '_none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="select-meeting-day">
                      <SelectValue placeholder="No recurring meeting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No recurring meeting</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-time">Meeting Time</Label>
                  <Input
                    id="meeting-time"
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    data-testid="input-meeting-time"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set a weekly meeting day to automatically prioritize related tasks for assigned employees.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Services Enabled</Label>
              <div className="grid grid-cols-2 gap-2">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover-elevate"
                    data-testid={`checkbox-service-${service.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedServices.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm text-foreground">{service.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>
                Assign Team Members ({formData.selectedEmployees.length} assigned)
              </Label>
              {formData.selectedServices.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground border">
                  <AlertCircle className="h-4 w-4" />
                  Please select at least one service above before assigning team members
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Select employees and their roles for this client</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {employees.map((employee) => {
                      const assignedService = formData.selectedEmployees.find(
                        emp => emp.employee_id === employee.id
                      )?.service_id;

                      return (
                        <div
                          key={employee.id}
                          className="flex items-center gap-3 p-3 border rounded-md"
                          data-testid={`employee-assignment-${employee.id}`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedEmployees.some(emp => emp.employee_id === employee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selectedEmployees: [
                                    ...formData.selectedEmployees,
                                    { employee_id: employee.id, service_id: formData.selectedServices[0] }
                                  ]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedEmployees: formData.selectedEmployees.filter(
                                    emp => emp.employee_id !== employee.id
                                  )
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{employee.full_name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </div>
                          {formData.selectedEmployees.some(emp => emp.employee_id === employee.id) && (
                            <Select
                              value={assignedService || ''}
                              onValueChange={(value) => {
                                setFormData({
                                  ...formData,
                                  selectedEmployees: formData.selectedEmployees.map(emp =>
                                    emp.employee_id === employee.id
                                      ? { ...emp, service_id: value }
                                      : emp
                                  )
                                });
                              }}
                            >
                              <SelectTrigger className="w-40" data-testid={`select-role-${employee.id}`}>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {formData.selectedServices.map((serviceId) => {
                                  const service = services.find(s => s.id === serviceId);
                                  return (
                                    <SelectItem key={serviceId} value={serviceId}>
                                      {service?.name}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-notes">Notes</Label>
              <textarea
                id="client-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="input-client-notes"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-client"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-client">
                {editingClient ? 'Update Client' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignModal && !!selectedClient} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team for {selectedClient?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Current Team Assignments</h3>
              {selectedClient?.assignments && selectedClient.assignments.length > 0 ? (
                <div className="space-y-2">
                  {selectedClient.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between gap-4 flex-wrap p-3 bg-muted rounded-md" data-testid={`text-assignment-${assignment.id}`}>
                      <div>
                        <p className="text-sm font-medium text-foreground">{assignment.employee?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{assignment.service?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Assign New Team Members</h3>
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Team Members ({assignFormData.employee_ids.length} selected)
                  </Label>
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <label
                          key={employee.id}
                          className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate"
                          data-testid={`checkbox-assign-employee-${employee.id}`}
                        >
                          <input
                            type="checkbox"
                            checked={assignFormData.employee_ids.includes(employee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignFormData({
                                  ...assignFormData,
                                  employee_ids: [...assignFormData.employee_ids, employee.id]
                                });
                              } else {
                                setAssignFormData({
                                  ...assignFormData,
                                  employee_ids: assignFormData.employee_ids.filter(id => id !== employee.id)
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{employee.full_name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {assignFormData.employee_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignFormData.employee_ids.map((employeeId) => {
                        const employee = employees.find(e => e.id === employeeId);
                        return (
                          <Badge
                            key={employeeId}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-selected-employee-${employeeId}`}
                          >
                            {employee?.full_name}
                            <button
                              type="button"
                              onClick={() => {
                                setAssignFormData({
                                  ...assignFormData,
                                  employee_ids: assignFormData.employee_ids.filter(id => id !== employeeId)
                                });
                              }}
                              className="rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Service/Role</Label>
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
                  <p className="text-xs text-muted-foreground">Only services enabled for this client can be assigned</p>
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
                  <Button type="submit" data-testid="button-submit-assign">
                    Assign Team Members
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
