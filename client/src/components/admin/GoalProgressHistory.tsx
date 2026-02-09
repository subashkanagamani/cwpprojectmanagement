import { useState, useEffect } from 'react';
import { Clock, TrendingUp, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface ProgressEntry {
  id: string;
  value: number;
  notes: string | null;
  recorded_at: string;
  recorded_by: string;
  recorder?: {
    full_name: string;
  };
}

interface GoalProgressHistoryProps {
  goalId: string;
  unit: string;
}

export function GoalProgressHistory({ goalId, unit }: GoalProgressHistoryProps) {
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [goalId]);

  async function loadHistory() {
    try {
      const { data, error } = await supabase
        .from('goal_progress')
        .select(`
          *,
          recorder:profiles!recorded_by(full_name)
        `)
        .eq('goal_id', goalId)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading progress history:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No progress recorded yet</p>
        <p className="text-xs mt-1">Record your first update to start tracking progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Progress History
      </h3>
      <div className="space-y-3">
        {history.map((entry, index) => {
          const previousValue = history[index + 1]?.value;
          const change = previousValue ? entry.value - previousValue : null;
          const changePercentage = previousValue && previousValue > 0
            ? ((change! / previousValue) * 100)
            : null;

          return (
            <div
              key={entry.id}
              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-lg">
                      {entry.value} {unit}
                    </div>
                    {change !== null && (
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        change > 0
                          ? 'bg-green-100 text-green-700'
                          : change < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {change > 0 && '+'}{change.toFixed(2)} {unit}
                        {changePercentage !== null && ` (${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%)`}
                      </div>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {entry.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.recorder?.full_name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.recorded_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
