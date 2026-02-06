import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

interface ClientWithMeeting {
  id: string;
  name: string;
  weekly_meeting_day: number;
  meeting_time: string;
  days_until_meeting: number;
  pending_tasks: number;
}

export function UpcomingMeetingsPriority() {
  const { user } = useAuth();
  const [clientsWithMeetings, setClientsWithMeetings] = useState<ClientWithMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUpcomingMeetings();
    }
  }, [user]);

  const loadUpcomingMeetings = async () => {
    try {
      const { data: assignments, error: assignError } = await supabase
        .from('client_assignments')
        .select('client_id')
        .eq('employee_id', user!.id);

      if (assignError) throw assignError;

      const clientIds = assignments?.map(a => a.client_id) || [];

      if (clientIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name, weekly_meeting_day, meeting_time')
        .in('id', clientIds)
        .not('weekly_meeting_day', 'is', null);

      if (clientError) throw clientError;

      const clientsWithData = await Promise.all(
        (clients || []).map(async (client) => {
          const { count } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('assigned_to', user!.id)
            .neq('status', 'completed');

          const currentDay = new Date().getDay();
          let daysUntil = 0;

          if (client.weekly_meeting_day >= currentDay) {
            daysUntil = client.weekly_meeting_day - currentDay;
          } else {
            daysUntil = 7 - currentDay + client.weekly_meeting_day;
          }

          return {
            id: client.id,
            name: client.name,
            weekly_meeting_day: client.weekly_meeting_day,
            meeting_time: client.meeting_time,
            days_until_meeting: daysUntil,
            pending_tasks: count || 0
          };
        })
      );

      const sorted = clientsWithData
        .filter(c => c.days_until_meeting <= 3)
        .sort((a, b) => a.days_until_meeting - b.days_until_meeting);

      setClientsWithMeetings(sorted);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayNum: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  if (loading) {
    return null;
  }

  if (clientsWithMeetings.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-sm border-2 border-orange-300 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-orange-900 mb-1">
              🔥 Priority Alert: Upcoming Meetings
            </h3>
            <p className="text-sm text-orange-800">
              Focus on these clients with meetings in the next few days
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {clientsWithMeetings.map((client) => (
            <div
              key={client.id}
              className={`bg-white rounded-lg p-4 border-2 transition-all ${
                client.days_until_meeting === 0
                  ? 'border-red-400 bg-red-50'
                  : client.days_until_meeting === 1
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-yellow-400 bg-yellow-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">{client.name}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {client.days_until_meeting === 0
                          ? 'Meeting Today'
                          : client.days_until_meeting === 1
                          ? 'Meeting Tomorrow'
                          : `Meeting ${getDayName(client.weekly_meeting_day)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{client.meeting_time}</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{client.pending_tasks}</div>
                  <div className="text-xs text-gray-600">pending tasks</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
