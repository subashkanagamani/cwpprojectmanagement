import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
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

export function TimeTrackingPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    client_id: '',
    service_id: '',
    description: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    is_billable: true,
    hourly_rate: '',
  });

  useEffect(() => {
    loadEntries();
    loadEmployees();
    loadClients();
    loadServices();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*, profiles(full_name), clients(name), services(name)')
      .order('date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading time entries:', error);
      showToast('Failed to load time entries', 'error');
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'active');
    if (data) setEmployees(data);
  };

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    if (data) setClients(data);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('id, name').eq('is_active', true);
    if (data) setServices(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryData = {
      ...formData,
      hours: Number(formData.hours),
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
    };

    try {
      const { error } = await supabase.from('time_entries').insert(entryData);
      if (error) throw error;
      showToast('Time entry logged successfully', 'success');
      setShowModal(false);
      loadEntries();
    } catch (error) {
      console.error('Error saving time entry:', error);
      showToast('Failed to save time entry', 'error');
    }
  };

  const getTotalHours = () => {
    return entries.reduce((sum, entry) => sum + entry.hours, 0);
  };

  const getTotalRevenue = () => {
    return entries.reduce((sum, entry) => {
      if (entry.is_billable && entry.hourly_rate) {
        return sum + (entry.hours * entry.hourly_rate);
      }
      return sum;
    }, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Time Tracking</h1>
          <p className="text-sm text-muted-foreground">Log and track time spent on client work</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="button-log-time">
          <Plus className="h-4 w-4 mr-2" />
          Log Time
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-total-hours">{getTotalHours().toFixed(1)}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Billable Revenue</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-total-revenue">${getTotalRevenue().toLocaleString()}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/40">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Clock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">No time entries yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Log your first time entry to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={entry.id} data-testid={`row-time-entry-${entry.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
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
              <div className="flex items-end">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-time"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-time">
                Log Time
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
