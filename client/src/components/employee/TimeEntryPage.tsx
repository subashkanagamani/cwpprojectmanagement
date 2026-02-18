import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface TimeEntry {
  id?: string;
  date: string;
  client_id: string;
  service_id: string;
  hours: number;
  description: string;
  is_billable: boolean;
}

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

export default function TimeEntryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadData();
  }, [weekStart]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, servicesRes, entriesRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
        supabase.from('services').select('id, name').eq('is_active', true).order('name'),
        supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', user?.id)
          .gte('date', format(weekStart, 'yyyy-MM-dd'))
          .lt('date', format(addDays(weekStart, 7), 'yyyy-MM-dd'))
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (entriesRes.error) throw entriesRes.error;

      setClients(clientsRes.data || []);
      setServices(servicesRes.data || []);
      setEntries(entriesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getEntryForDate = (date: Date, clientId?: string, serviceId?: string) => {
    return entries.find(e =>
      isSameDay(parseISO(e.date), date) &&
      (!clientId || e.client_id === clientId) &&
      (!serviceId || e.service_id === serviceId)
    );
  };

  const updateEntry = (date: Date, field: keyof TimeEntry, value: any, index: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const newEntries = [...entries];

    const existingIndex = newEntries.findIndex(e => e.date === dateStr);
    if (existingIndex >= 0) {
      newEntries[existingIndex] = { ...newEntries[existingIndex], [field]: value };
    } else {
      newEntries.push({
        date: dateStr,
        client_id: field === 'client_id' ? value : '',
        service_id: field === 'service_id' ? value : '',
        hours: field === 'hours' ? value : 0,
        description: field === 'description' ? value : '',
        is_billable: field === 'is_billable' ? value : true,
      });
    }

    setEntries(newEntries);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const validEntries = entries.filter(e =>
        e.client_id && e.service_id && e.hours > 0
      );

      if (validEntries.length === 0) {
        showToast('No valid entries to save', 'error');
        return;
      }

      const entriesToUpsert = validEntries.map(e => ({
        ...e,
        employee_id: user?.id,
        id: e.id || undefined
      }));

      const { error } = await supabase
        .from('time_entries')
        .upsert(entriesToUpsert, { onConflict: 'id' });

      if (error) throw error;

      showToast('Time entries saved successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getTotalHours = () => {
    return entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Time Entry</h1>
          <p className="text-muted-foreground mt-1">Track your time for the week</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="font-semibold">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </div>
            <div className="text-sm text-muted-foreground">{getTotalHours()} hours total</div>
          </div>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Time
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[0, 1, 2].map((rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-10 gap-4 items-start">
                <div className="col-span-2">
                  {rowIndex === 0 && <Label>Client</Label>}
                  <Select
                    value={entries[rowIndex]?.client_id || ''}
                    onValueChange={(value) => updateEntry(weekDays[0], 'client_id', value, rowIndex)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
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

                <div className="col-span-2">
                  {rowIndex === 0 && <Label>Service</Label>}
                  <Select
                    value={entries[rowIndex]?.service_id || ''}
                    onValueChange={(value) => updateEntry(weekDays[0], 'service_id', value, rowIndex)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
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

                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="flex flex-col">
                    {rowIndex === 0 && (
                      <Label className="text-center mb-1">
                        {format(day, 'EEE')}
                        <br />
                        <span className="text-xs text-muted-foreground">{format(day, 'M/d')}</span>
                      </Label>
                    )}
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="0"
                      className="text-center"
                      value={getEntryForDate(day, entries[rowIndex]?.client_id, entries[rowIndex]?.service_id)?.hours || ''}
                      onChange={(e) => updateEntry(day, 'hours', parseFloat(e.target.value) || 0, rowIndex)}
                    />
                  </div>
                ))}
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="grid grid-cols-10 gap-4 font-semibold">
                <div className="col-span-4">Daily Totals:</div>
                {weekDays.map((day, dayIndex) => {
                  const dayTotal = entries
                    .filter(e => isSameDay(parseISO(e.date), day))
                    .reduce((sum, e) => sum + (e.hours || 0), 0);
                  return (
                    <div key={dayIndex} className="text-center">
                      {dayTotal > 0 ? dayTotal.toFixed(1) : '-'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What did you work on this week?"
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
