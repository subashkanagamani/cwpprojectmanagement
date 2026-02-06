import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout, Plus, Edit2, Trash2, X, Eye, EyeOff, MoveVertical } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

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

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error loading widgets:', error);
      showToast('Failed to load widgets', 'error');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingWidget) {
        const { error } = await supabase
          .from('dashboard_widgets')
          .update({
            widget_type: formData.widget_type,
            size: formData.size,
            is_visible: formData.is_visible,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWidget.id);

        if (error) throw error;
        showToast('Widget updated successfully', 'success');
      } else {
        const maxPosition = widgets.length > 0 ? Math.max(...widgets.map(w => w.position)) : 0;
        const { error } = await supabase
          .from('dashboard_widgets')
          .insert({
            user_id: user.id,
            widget_type: formData.widget_type,
            position: maxPosition + 1,
            size: formData.size,
            config: {},
            is_visible: formData.is_visible,
          });

        if (error) throw error;
        showToast('Widget added successfully', 'success');
      }

      setShowModal(false);
      loadWidgets();
    } catch (error) {
      console.error('Error saving widget:', error);
      showToast('Failed to save widget', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this widget?')) return;

    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Widget removed successfully', 'success');
      loadWidgets();
    } catch (error) {
      console.error('Error deleting widget:', error);
      showToast('Failed to remove widget', 'error');
    }
  };

  const toggleVisibility = async (widget: DashboardWidget) => {
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .update({ is_visible: !widget.is_visible })
        .eq('id', widget.id);

      if (error) throw error;
      showToast(`Widget ${!widget.is_visible ? 'shown' : 'hidden'}`, 'success');
      loadWidgets();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      showToast('Failed to update widget', 'error');
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
        supabase
          .from('dashboard_widgets')
          .update({ position: targetWidget.position })
          .eq('id', currentWidget.id),
        supabase
          .from('dashboard_widgets')
          .update({ position: currentWidget.position })
          .eq('id', targetWidget.id),
      ]);

      showToast('Widget position updated', 'success');
      loadWidgets();
    } catch (error) {
      console.error('Error moving widget:', error);
      showToast('Failed to move widget', 'error');
    }
  };

  const getWidgetLabel = (type: string) => {
    return AVAILABLE_WIDGETS.find(w => w.type === type)?.label || type;
  };

  const getSizeColor = (size: DashboardWidget['size']) => {
    const colors = {
      small: 'bg-blue-100 text-blue-800',
      medium: 'bg-green-100 text-green-800',
      large: 'bg-purple-100 text-purple-800',
    };
    return colors[size];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading widgets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Customization</h1>
          <p className="text-gray-600 mt-1">Customize your dashboard widgets and layout</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          <Plus className="h-5 w-5" />
          Add Widget
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Customize which widgets appear on your dashboard. Use the visibility toggle to show/hide widgets,
          and drag to reorder them.
        </p>
      </div>

      <div className="space-y-4 max-h-[700px] overflow-y-auto">
        {widgets.map((widget, index) => (
          <div
            key={widget.id}
            className={`bg-white rounded-xl shadow-sm border p-6 transition ${
              widget.is_visible ? '' : 'opacity-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4 flex-1">
                <Layout className="h-6 w-6 text-blue-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getWidgetLabel(widget.widget_type)}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSizeColor(widget.size)}`}>
                      {widget.size}
                    </span>
                    {!widget.is_visible && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {AVAILABLE_WIDGETS.find(w => w.type === widget.widget_type)?.description || 'Custom widget'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Position: {widget.position}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <MoveVertical className="h-4 w-4 text-gray-600 rotate-180" />
                  </button>
                  <button
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <MoveVertical className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={() => toggleVisibility(widget)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title={widget.is_visible ? 'Hide' : 'Show'}
                >
                  {widget.is_visible ? (
                    <Eye className="h-4 w-4 text-gray-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => openModal(widget)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(widget.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {widgets.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No widgets configured yet</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first widget
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingWidget ? 'Edit Widget' : 'Add Widget'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Widget Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.widget_type}
                  onChange={(e) => setFormData({ ...formData, widget_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  disabled={!!editingWidget}
                >
                  <option value="">Select a widget type</option>
                  {AVAILABLE_WIDGETS.map((widget) => (
                    <option key={widget.type} value={widget.type}>
                      {widget.label} - {widget.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value as DashboardWidget['size'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="small">Small (1/3 width)</option>
                  <option value="medium">Medium (1/2 width)</option>
                  <option value="large">Large (Full width)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_visible"
                  checked={formData.is_visible}
                  onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_visible" className="text-sm text-gray-700">
                  Visible on dashboard
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {editingWidget ? 'Update Widget' : 'Add Widget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
