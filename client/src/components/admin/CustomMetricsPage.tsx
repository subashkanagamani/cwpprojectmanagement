import { useState, useEffect } from 'react';
import { Sliders, Plus, Edit2, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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

  const getMetricTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'number': return 'default';
      case 'currency': return 'secondary';
      case 'percentage': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Custom Metrics</h1>
          <p className="text-sm text-muted-foreground">Define custom KPIs for each service</p>
        </div>
        <Button data-testid="button-add-metric" onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Metric
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                data-testid="input-search-metrics"
                placeholder="Search metrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterService}
              onValueChange={(value) => setFilterService(value === 'all' ? '' : value)}
            >
              <SelectTrigger data-testid="select-filter-service" className="w-full md:w-[200px]">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMetrics.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Sliders className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No custom metrics found</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first custom metric to start tracking</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMetrics.map((metric) => (
            <Card key={metric.id} data-testid={`card-metric-${metric.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">
                        {metric.metric_name}
                      </h3>
                      <Badge variant={getMetricTypeBadgeVariant(metric.metric_type)} data-testid={`badge-type-${metric.id}`}>
                        {getMetricTypeLabel(metric.metric_type)}
                      </Badge>
                      <Badge variant={metric.is_active ? 'default' : 'secondary'} data-testid={`badge-status-${metric.id}`}>
                        {metric.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Service:</span> {metric.service?.name}
                    </p>
                    {metric.description && (
                      <p className="text-sm text-muted-foreground">
                        {metric.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(metric)}
                      aria-label={metric.is_active ? 'Deactivate metric' : 'Activate metric'}
                      data-testid={`button-toggle-${metric.id}`}
                    >
                      {metric.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openModal(metric)}
                      aria-label="Edit metric"
                      data-testid={`button-edit-${metric.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(metric.id)}
                      aria-label="Delete metric"
                      data-testid={`button-delete-${metric.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? 'Edit Custom Metric' : 'Add Custom Metric'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_id">Service *</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => setFormData({ ...formData, service_id: value })}
              >
                <SelectTrigger data-testid="select-service">
                  <SelectValue placeholder="Select a service" />
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

            <div className="space-y-2">
              <Label htmlFor="metric_name">Metric Name *</Label>
              <Input
                id="metric_name"
                data-testid="input-metric-name"
                required
                value={formData.metric_name}
                onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                placeholder="e.g., Response Rate, Quality Score"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metric_type">Metric Type *</Label>
              <Select
                value={formData.metric_type}
                onValueChange={(value) => setFormData({ ...formData, metric_type: value as any })}
              >
                <SelectTrigger data-testid="select-metric-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This determines how the metric value will be displayed and validated
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="input-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe what this metric measures and how it should be calculated"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                data-testid="checkbox-is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
              />
              <Label htmlFor="is_active" className="font-normal">
                Active (show in report submission forms)
              </Label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-metric">
                {editingMetric ? 'Update' : 'Create'} Metric
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
