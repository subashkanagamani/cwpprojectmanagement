import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout, Plus, Edit2, Trash2, Eye, EyeOff, MoveVertical, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  config: Record<string, any>;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_WIDGETS = [
  { type: 'active_clients', label: 'Active Clients Count', description: 'Display total active clients' },
  { type: 'pending_reports', label: 'Pending Reports', description: 'Reports awaiting submission' },
  { type: 'revenue_chart', label: 'Revenue Chart', description: 'Monthly revenue visualization' },
  { type: 'team_utilization', label: 'Team Utilization', description: 'Employee capacity overview' },
  { type: 'recent_activity', label: 'Recent Activity', description: 'Latest system activities' },
  { type: 'upcoming_deadlines', label: 'Upcoming Deadlines', description: 'Report due dates' },
  { type: 'client_health', label: 'Client Health', description: 'Client health status overview' },
  { type: 'goal_progress', label: 'Goal Progress', description: 'Track goal completion' },
  { type: 'time_tracking', label: 'Time Tracking Summary', description: 'Billable hours overview' },
  { type: 'budget_alerts', label: 'Budget Alerts', description: 'Budget utilization warnings' },
];

export function DashboardCustomizationPage() {
  const { showToast } = useToast();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    widget_type: '',
    size: 'medium' as DashboardWidget['size'],
    is_visible: true,
  });

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('dashboard_widgets') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error loading widgets:', error);
      showToast('error', 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (widget?: DashboardWidget) => {
    if (widget) {
      setEditingWidget(widget);
      setFormData({
        widget_type: widget.widget_type,
        size: widget.size,
        is_visible: widget.is_visible,
      });
    } else {
      setEditingWidget(null);
      setFormData({
        widget_type: '',
        size: 'medium',
        is_visible: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingWidget) {
        const { error } = await (supabase
          .from('dashboard_widgets') as any)
          .update({
            widget_type: formData.widget_type,
            size: formData.size,
            is_visible: formData.is_visible,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWidget.id);

        if (error) throw error;
        showToast('success', 'Widget updated successfully');
      } else {
        const maxPosition = widgets.length > 0 ? Math.max(...widgets.map(w => w.position)) : 0;
        const { error } = await (supabase
          .from('dashboard_widgets') as any)
          .insert({
            user_id: user.id,
            widget_type: formData.widget_type,
            position: maxPosition + 1,
            size: formData.size,
            config: {},
            is_visible: formData.is_visible,
          });

        if (error) throw error;
        showToast('success', 'Widget added successfully');
      }

      setShowModal(false);
      loadWidgets();
    } catch (error) {
      console.error('Error saving widget:', error);
      showToast('error', 'Failed to save widget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this widget?')) return;

    try {
      const { error } = await (supabase
        .from('dashboard_widgets') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('success', 'Widget removed successfully');
      loadWidgets();
    } catch (error) {
      console.error('Error deleting widget:', error);
      showToast('error', 'Failed to remove widget');
    }
  };

  const toggleVisibility = async (widget: DashboardWidget) => {
    try {
      const { error } = await (supabase
        .from('dashboard_widgets') as any)
        .update({ is_visible: !widget.is_visible })
        .eq('id', widget.id);

      if (error) throw error;
      showToast('success', `Widget ${!widget.is_visible ? 'shown' : 'hidden'}`);
      loadWidgets();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      showToast('error', 'Failed to update widget');
    }
  };

  const moveWidget = async (widgetId: string, direction: 'up' | 'down') => {
    const currentIndex = widgets.findIndex(w => w.id === widgetId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === widgets.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentWidget = widgets[currentIndex];
    const targetWidget = widgets[targetIndex];

    try {
      await Promise.all([
        (supabase
          .from('dashboard_widgets') as any)
          .update({ position: targetWidget.position })
          .eq('id', currentWidget.id),
        (supabase
          .from('dashboard_widgets') as any)
          .update({ position: currentWidget.position })
          .eq('id', targetWidget.id),
      ]);

      showToast('success', 'Widget position updated');
      loadWidgets();
    } catch (error) {
      console.error('Error moving widget:', error);
      showToast('error', 'Failed to move widget');
    }
  };

  const getWidgetLabel = (type: string) => {
    return AVAILABLE_WIDGETS.find(w => w.type === type)?.label || type;
  };

  const getSizeVariant = (size: DashboardWidget['size']): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      small: 'outline',
      medium: 'secondary',
      large: 'default',
    };
    return variants[size] || 'secondary';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard Customization</h1>
          <p className="text-sm text-muted-foreground">Customize your dashboard widgets and layout</p>
        </div>
        <Button
          onClick={() => openModal()}
          data-testid="button-add-widget"
        >
          <Plus className="h-4 w-4" />
          Add Widget
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Customize which widgets appear on your dashboard. Use the visibility toggle to show/hide widgets,
            and use the arrows to reorder them.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {widgets.map((widget, index) => (
          <Card
            key={widget.id}
            className={widget.is_visible ? '' : 'opacity-50'}
            data-testid={`card-widget-${widget.id}`}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex items-start gap-4 flex-1">
                  <Layout className="h-6 w-6 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-foreground" data-testid={`text-widget-name-${widget.id}`}>
                        {getWidgetLabel(widget.widget_type)}
                      </h3>
                      <Badge variant={getSizeVariant(widget.size)} className="no-default-active-elevate">
                        {widget.size}
                      </Badge>
                      {!widget.is_visible && (
                        <Badge variant="outline" className="no-default-active-elevate">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {AVAILABLE_WIDGETS.find(w => w.type === widget.widget_type)?.description || 'Custom widget'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Position: {widget.position}</p>
                  </div>
                </div>

                <div className="flex gap-1 items-center">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveWidget(widget.id, 'up')}
                      disabled={index === 0}
                      data-testid={`button-move-up-${widget.id}`}
                    >
                      <MoveVertical className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveWidget(widget.id, 'down')}
                      disabled={index === widgets.length - 1}
                      data-testid={`button-move-down-${widget.id}`}
                    >
                      <MoveVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleVisibility(widget)}
                    data-testid={`button-toggle-visibility-${widget.id}`}
                  >
                    {widget.is_visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openModal(widget)}
                    data-testid={`button-edit-widget-${widget.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(widget.id)}
                    data-testid={`button-delete-widget-${widget.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {widgets.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No widgets configured yet</p>
              <Button
                variant="link"
                onClick={() => openModal()}
                data-testid="button-add-first-widget"
              >
                Add your first widget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) setShowModal(false);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWidget ? 'Edit Widget' : 'Add Widget'}</DialogTitle>
            <DialogDescription>
              {editingWidget ? 'Update the widget settings below.' : 'Choose a widget type and configure its settings.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Widget Type <span className="text-destructive">*</span></Label>
              <Select
                value={formData.widget_type}
                onValueChange={(value) => setFormData({ ...formData, widget_type: value })}
                disabled={!!editingWidget}
              >
                <SelectTrigger data-testid="select-widget-type">
                  <SelectValue placeholder="Select a widget type" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_WIDGETS.map((widget) => (
                    <SelectItem key={widget.type} value={widget.type}>
                      {widget.label} - {widget.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Size <span className="text-destructive">*</span></Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value as DashboardWidget['size'] })}
              >
                <SelectTrigger data-testid="select-widget-size">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (1/3 width)</SelectItem>
                  <SelectItem value="medium">Medium (1/2 width)</SelectItem>
                  <SelectItem value="large">Large (Full width)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_visible"
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked === true })}
                data-testid="checkbox-widget-visible"
              />
              <Label htmlFor="is_visible">Visible on dashboard</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-widget"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                data-testid="button-submit-widget"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingWidget ? 'Update Widget' : 'Add Widget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
