import { useState, useEffect } from 'react';
import { Check, X, Clock, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Timesheet {
  id: string;
  employee_id: string;
  week_start: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_hours: number;
  submitted_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  is_billable: boolean;
  clients: { name: string };
  services: { name: string };
}

export default function TimesheetsManagementPage() {
  const { showToast } = useToast();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimesheets, setSelectedTimesheets] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [weekFilter, setWeekFilter] = useState('');

  useEffect(() => {
    fetchTimesheets();
  }, [statusFilter, weekFilter]);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          profiles:employee_id(full_name, email)
        `)
        .order('week_start', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (weekFilter) {
        query = query.eq('week_start', weekFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTimesheets(data || []);
    } catch (error) {
      showToast('Failed to load timesheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async (timesheetId: string, employeeId: string, weekStart: string) => {
    try {
      const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          clients(name),
          services(name)
        `)
        .eq('employee_id', employeeId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date');

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      showToast('Failed to load time entries', 'error');
    }
  };

  const handleTimesheetClick = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    fetchTimeEntries(timesheet.id, timesheet.employee_id, timesheet.week_start);
  };

  const handleApprove = async (timesheetId: string) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', timesheetId);

      if (error) throw error;
      showToast('Timesheet approved', 'success');
      fetchTimesheets();
      setSelectedTimesheet(null);
    } catch (error) {
      showToast('Failed to approve timesheet', 'error');
    }
  };

  const handleReject = async (timesheetId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
        })
        .eq('id', timesheetId);

      if (error) throw error;
      showToast('Timesheet rejected', 'success');
      fetchTimesheets();
      setSelectedTimesheet(null);
    } catch (error) {
      showToast('Failed to reject timesheet', 'error');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedTimesheets.size === 0) return;

    if (!confirm(`Approve ${selectedTimesheets.size} timesheet(s)?`)) return;

    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .in('id', Array.from(selectedTimesheets));

      if (error) throw error;
      showToast(`${selectedTimesheets.size} timesheet(s) approved`, 'success');
      setSelectedTimesheets(new Set());
      fetchTimesheets();
    } catch (error) {
      showToast('Failed to approve timesheets', 'error');
    }
  };

  const toggleTimesheetSelection = (id: string) => {
    const newSelection = new Set(selectedTimesheets);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTimesheets(newSelection);
  };

  const selectAll = () => {
    if (selectedTimesheets.size === timesheets.length) {
      setSelectedTimesheets(new Set());
    } else {
      setSelectedTimesheets(new Set(timesheets.map((t) => t.id)));
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'submitted': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Timesheet Management</h1>
          <p className="text-sm text-muted-foreground">Review and approve employee timesheets</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
              <SelectTrigger className="w-[160px]" data-testid="trigger-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedTimesheets.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              data-testid="button-bulk-approve"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Selected ({selectedTimesheets.size})
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTimesheets.size === timesheets.length && timesheets.length > 0}
                    onCheckedChange={selectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.map((timesheet) => (
                <TableRow key={timesheet.id} data-testid={`row-timesheet-${timesheet.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTimesheets.has(timesheet.id)}
                      onCheckedChange={() => toggleTimesheetSelection(timesheet.id)}
                      data-testid={`checkbox-timesheet-${timesheet.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {timesheet.profiles.full_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{timesheet.profiles.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(timesheet.week_start), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right font-medium">{timesheet.total_hours}h</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(timesheet.status)} className="no-default-active-elevate">
                      {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTimesheetClick(timesheet)}
                        data-testid={`button-view-timesheet-${timesheet.id}`}
                      >
                        View
                      </Button>
                      {timesheet.status === 'submitted' && (
                        <>
                          <Button
                            size="icon"
                            variant="default"
                            onClick={() => handleApprove(timesheet.id)}
                            data-testid={`button-approve-timesheet-${timesheet.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleReject(timesheet.id)}
                            data-testid={`button-reject-timesheet-${timesheet.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {timesheets.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No timesheets found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTimesheet && (
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-3 border border-border rounded-md flex-wrap"
                data-testid={`row-time-entry-${entry.id}`}
              >
                <div className="w-32 text-sm text-muted-foreground">
                  {format(new Date(entry.date), 'EEE, MMM dd')}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {entry.clients.name} - {entry.services.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{entry.description}</div>
                </div>
                <div className="w-20 text-right font-medium">{entry.hours}h</div>
                <div className="w-20">
                  {entry.is_billable && (
                    <Badge variant="secondary" className="no-default-active-elevate">
                      Billable
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
