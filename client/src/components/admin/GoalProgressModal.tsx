import { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Goal {
  id: string;
  title: string;
  current_value: number;
  target_value: number;
  unit: string;
}

interface GoalProgressModalProps {
  goal: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

export function GoalProgressModal({ goal, onClose, onSuccess }: GoalProgressModalProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    value: goal.current_value.toString(),
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const newValue = parseFloat(formData.value);

      if (isNaN(newValue)) {
        throw new Error('Please enter a valid number');
      }

      if (newValue < 0) {
        throw new Error('Value cannot be negative');
      }

      const { error: progressError } = await supabase
        .from('goal_progress')
        .insert({
          goal_id: goal.id,
          value: newValue,
          notes: formData.notes || null,
          recorded_by: profile.id,
        });

      if (progressError) throw progressError;

      const { error: goalError } = await supabase
        .from('goals')
        .update({
          current_value: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id);

      if (goalError) throw goalError;

      showToast('Progress recorded successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to record progress', 'error');
    } finally {
      setLoading(false);
    }
  }

  const progressPercentage = goal.target_value > 0
    ? Math.min(100, (parseFloat(formData.value || '0') / goal.target_value) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Record Progress</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="font-medium text-sm mb-2">{goal.title}</h3>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Current: {goal.current_value} {goal.unit}</span>
              <span>Target: {goal.target_value} {goal.unit}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, (goal.current_value / goal.target_value) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              New Value <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="pr-16"
                required
                min="0"
              />
              {goal.unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {goal.unit}
                </span>
              )}
            </div>
            {formData.value && !isNaN(parseFloat(formData.value)) && (
              <div className="text-xs text-muted-foreground">
                Progress: {progressPercentage.toFixed(1)}% of target
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any relevant notes about this progress update..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Progress'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
