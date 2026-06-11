import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, Calendar, DollarSign, Edit2, Trash2, Search } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '../PaginationControls';
import { usePagination } from '../../hooks/usePagination';

interface TimeEntry {
  id: string;
  employee_id: string;
  client_id: string;
  service_id: string;
  description: string | null;
  hours: number;
  date: string;
  is_billable: boolean;
  hourly_rate: number | null;
  profiles?: { full_name: string };
  clients?: { name: string };
  services?: { name: string };
}

const EMPTY_FORM = {
  employee_id: '',
  client_id: '',
  service_id: '',
  description: '',
  hours: '',
  date: new Date().toISOString().split('T')[0],
  is_billable: true,
  hourly_rate: '',
};

export function TimeTrackingPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const pagination = usePagination(entries, 20);

  useEffect(() => {
    loadEntries();
  }, [dateFrom, dateTo, employeeFilter]);

  useEffect(() => {
    loadEmployees();
    loadClients();
    loadServices();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    let query = supabase
      .from('time_entries')
      .select('*, profiles(full_name), clients(name), services(name)')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false });

    if (employeeFilter !== 'all') {
      query = query.eq('employee_id', employeeFilter);
    }

    const { data, error } = await query;
    if (error) {
      showToast('Failed to load time entries', 'error');
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'employee')
      .eq('status', 'active')
      .order('full_name');
    if (data) setEmployees(data);
  };

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
    if (data) setClients(data);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('id, name').eq('is_active', true).order('name');
    if (data) setServices(data);
  };

  const openAdd = () => {
    setEditingEntry(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      client_id: entry.client_id,
      service_id: entry.service_id,
      description: entry.description || '',
      hours: entry.hours.toString(),
      date: entry.date,
      is_billable: entry.is_billable,
      hourly_rate: entry.hourly_rate?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entryData = {
      ...formData,
      hours: Number(formData.hours),
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
      description: formData.description || null,
    };

    try {
      if (editingEntry) {
        const { error } = await supabase.from('time_entries').update(entryData).eq('id', editingEntry.id);
        if (error) throw error;
        showToast('Time entry updated', 'success');
      } else {
        const { error } = await supabase.from('time_entries').insert(entryData);
        if (error) throw error;
        showToast('Time entry logged', 'success');
      }
      setShowModal(false);
      loadEntries();
    } catch (error: any) {
      showToast(error.message || 'Failed to save time entry', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this time entry?')) return;
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete entry', 'error');
    } else {
      showToast('Entry deleted', 'success');
      loadEntries();
    }
  };

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalRevenue = entries.reduce((s, e) => {
    if (e.is_billable && e.hourly_rate) return s + e.hours * e.hourly_rate;
    return s;
  }, 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">Log and track time spent on client work</p>
        </div>
        <Button onClick={openAdd} data-testid="button-log-time">
          <Plus className="h-4 w-4 mr-2" />
          Log Time
        </Button>
      </div>

      {/* Filters */}
      <div className="animate-fade-up grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ animationDelay: "50ms" }}>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="animate-fade-up grid grid-cols-1 md:grid-cols-2 gap-6" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-hours">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">{entries.length} entries</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Billable Revenue</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Clock className="h-8 w-8 opacity-40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No time entries for this period</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedData.map(entry => (
                    <TableRow key={entry.id} data-testid={`row-time-entry-${entry.id}`} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">{entry.profiles?.full_name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{entry.clients?.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{entry.services?.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-foreground">{entry.hours}h</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.is_billable ? 'default' : 'secondary'} className="text-xs">
                          {entry.is_billable ? 'Billable' : 'Non-billable'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{entry.description || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(entry)}
                            data-testid={`button-edit-entry-${entry.id}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(entry.id)}
                            data-testid={`button-delete-entry-${entry.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {pagination.totalPages > 1 && (
            <div className="px-4 py-4 border-t">
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Log Time Entry'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                >
                  <SelectTrigger data-testid="select-time-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="input-time-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger data-testid="select-time-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                >
                  <SelectTrigger data-testid="select-time-service">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  step="0.25"
                  min="0"
                  required
                  data-testid="input-time-hours"
                />
              </div>
              <div>
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  step="0.01"
                  min="0"
                  data-testid="input-time-rate"
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="billable"
                    checked={formData.is_billable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_billable: checked === true })}
                    data-testid="checkbox-billable"
                  />
                  <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="What did you work on?"
                data-testid="input-time-description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} data-testid="button-cancel-time">
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-time">
                {editingEntry ? 'Update Entry' : 'Log Time'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
