import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Calendar, User, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format, startOfWeek, addDays } from 'date-fns';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheet Management</h1>
          <p className="text-gray-600">Review and approve employee timesheets</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-1.5"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {selectedTimesheets.size > 0 && (
            <button
              onClick={handleBulkApprove}
              className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Approve Selected ({selectedTimesheets.size})
            </button>
          )}
        </div>

        <div className="divide-y">
          <div className="p-4 bg-gray-50 flex items-center gap-4 font-medium text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedTimesheets.size === timesheets.length && timesheets.length > 0}
              onChange={selectAll}
              className="h-4 w-4 rounded"
            />
            <div className="flex-1">Employee</div>
            <div className="w-32">Week</div>
            <div className="w-24 text-right">Hours</div>
            <div className="w-32">Status</div>
            <div className="w-40">Actions</div>
          </div>

          {timesheets.map((timesheet) => (
            <div
              key={timesheet.id}
              className="p-4 hover:bg-gray-50 flex items-center gap-4"
            >
              <input
                type="checkbox"
                checked={selectedTimesheets.has(timesheet.id)}
                onChange={() => toggleTimesheetSelection(timesheet.id)}
                className="h-4 w-4 rounded"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {timesheet.profiles.full_name}
                </div>
                <div className="text-sm text-gray-500">{timesheet.profiles.email}</div>
              </div>
              <div className="w-32 text-sm text-gray-600">
                {format(new Date(timesheet.week_start), 'MMM dd, yyyy')}
              </div>
              <div className="w-24 text-right font-medium">{timesheet.total_hours}h</div>
              <div className="w-32">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    timesheet.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : timesheet.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : timesheet.status === 'submitted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                </span>
              </div>
              <div className="w-40 flex gap-2">
                <button
                  onClick={() => handleTimesheetClick(timesheet)}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  View
                </button>
                {timesheet.status === 'submitted' && (
                  <>
                    <button
                      onClick={() => handleApprove(timesheet.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReject(timesheet.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      title="Reject"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {timesheets.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No timesheets found</p>
          </div>
        )}
      </div>

      {selectedTimesheet && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Time Entries</h3>
          <div className="space-y-2">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50"
              >
                <div className="w-32 text-sm text-gray-600">
                  {format(new Date(entry.date), 'EEE, MMM dd')}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {entry.clients.name} - {entry.services.name}
                  </div>
                  <div className="text-sm text-gray-600">{entry.description}</div>
                </div>
                <div className="w-20 text-right font-medium">{entry.hours}h</div>
                <div className="w-20">
                  {entry.is_billable && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Billable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
