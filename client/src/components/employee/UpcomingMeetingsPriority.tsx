import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <Card data-testid="card-upcoming-meetings">
        <CardHeader>
          <div className="flex items-start gap-3 flex-wrap">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-lg">Priority Alert: Upcoming Meetings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Focus on these clients with meetings in the next few days
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {clientsWithMeetings.map((client) => (
            <Card
              key={client.id}
              data-testid={`card-meeting-${client.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1" data-testid={`text-meeting-client-${client.id}`}>{client.name}</h4>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <div className="flex items-center gap-1 text-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">
                          {client.days_until_meeting === 0
                            ? 'Meeting Today'
                            : client.days_until_meeting === 1
                            ? 'Meeting Tomorrow'
                            : `Meeting ${getDayName(client.weekly_meeting_day)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{client.meeting_time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold tracking-tight text-foreground" data-testid={`text-pending-tasks-${client.id}`}>{client.pending_tasks}</div>
                    <div className="text-xs text-muted-foreground">pending tasks</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
