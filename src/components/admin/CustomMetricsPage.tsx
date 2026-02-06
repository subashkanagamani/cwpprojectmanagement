import { useState, useEffect } from 'react';
import { Sliders, Plus, Edit2, Trash2, X, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface CustomMetric {
  id: string;
  service_id: string;
  metric_name: string;
  metric_type: 'number' | 'currency' | 'percentage';
  description?: string;
  is_active: boolean;
  created_at: string;
  service?: {
    name: string;
  };
}

interface Service {
  id: string;
  name: string;
}

export function CustomMetricsPage() {
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetric | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('');
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    service_id: '',
    metric_name: '',
    metric_type: 'number' as 'number' | 'currency' | 'percentage',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [metricsRes, servicesRes] = await Promise.all([
        supabase
          .from('custom_metrics')
          .select('*, service:services(name)')
          .order('service_id', { ascending: true })
          .order('metric_name', { ascending: true }),
        supabase
          .from('services')
          .select('id, name')
          .order('name', { ascending: true })
      ]);

      if (metricsRes.error) throw metricsRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setMetrics(metricsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function openModal(metric?: CustomMetric) {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        service_id: metric.service_id,
        metric_name: metric.metric_name,
        metric_type: metric.metric_type,
        description: metric.description || '',
        is_active: metric.is_active
      });
    } else {
      setEditingMetric(null);
      setFormData({
        service_id: '',
        metric_name: '',
        metric_type: 'number',
        description: '',
        is_active: true
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      service_id: formData.service_id,
      metric_name: formData.metric_name,
      metric_type: formData.metric_type,
      description: formData.description || null,
      is_active: formData.is_active
    };

    try {
      if (editingMetric) {
        const { error } = await supabase
          .from('custom_metrics')
          .update(data)
          .eq('id', editingMetric.id);

        if (error) throw error;
        showToast('Custom metric updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('custom_metrics')
          .insert([data]);

        if (error) throw error;
        showToast('Custom metric created successfully', 'success');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleToggleActive(metric: CustomMetric) {
    try {
      const { error } = await supabase
        .from('custom_metrics')
        .update({ is_active: !metric.is_active })
        .eq('id', metric.id);

      if (error) throw error;
      showToast(
        metric.is_active ? 'Metric deactivated' : 'Metric activated',
        'success'
      );
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this custom metric?')) return;

    try {
      const { error } = await supabase
        .from('custom_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Custom metric deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  const filteredMetrics = metrics.filter(metric => {
    const matchesSearch = metric.metric_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = !filterService || metric.service_id === filterService;
    return matchesSearch && matchesService;
  });

  const getMetricTypeLabel = (type: string) => {
    switch (type) {
      case 'number': return 'Number';
      case 'currency': return 'Currency';
      case 'percentage': return 'Percentage';
      default: return type;
    }
  };

  const getMetricTypeBadge = (type: string) => {
    const colors = {
      number: 'bg-blue-100 text-blue-700',
      currency: 'bg-green-100 text-green-700',
      percentage: 'bg-purple-100 text-purple-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sliders className="w-7 h-7 text-blue-600" />
          Custom Metrics
        </h1>
        <p className="text-gray-600 mt-1">Define custom KPIs for each service</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Metric
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading metrics...</p>
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Sliders className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No custom metrics found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first custom metric to start tracking</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMetrics.map((metric) => (
            <div
              key={metric.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {metric.metric_name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getMetricTypeBadge(metric.metric_type)}`}>
                      {getMetricTypeLabel(metric.metric_type)}
                    </span>
                    {metric.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Service:</span> {metric.service?.name}
                  </p>
                  {metric.description && (
                    <p className="text-sm text-gray-600">
                      {metric.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(metric)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label={metric.is_active ? 'Deactivate metric' : 'Activate metric'}
                  >
                    {metric.is_active ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => openModal(metric)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Edit metric"
                  >
                    <Edit2 className="w-5 h-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(metric.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Delete metric"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingMetric ? 'Edit Custom Metric' : 'Add Custom Metric'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service *
                </label>
                <select
                  required
                  value={formData.service_id}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.metric_name}
                  onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Response Rate, Quality Score"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric Type *
                </label>
                <select
                  required
                  value={formData.metric_type}
                  onChange={(e) => setFormData({ ...formData, metric_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percentage">Percentage</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This determines how the metric value will be displayed and validated
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this metric measures and how it should be calculated"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (show in report submission forms)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingMetric ? 'Update' : 'Create'} Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
