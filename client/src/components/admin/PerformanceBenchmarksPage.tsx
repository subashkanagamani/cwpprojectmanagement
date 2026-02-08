import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

interface Benchmark {
  id: string;
  industry: string;
  service_id: string;
  metric_name: string;
  average_value: number;
  top_quartile_value?: number;
  data_source?: string;
  period: string;
  service?: {
    name: string;
  };
}

interface Service {
  id: string;
  name: string;
}

export function PerformanceBenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<Benchmark | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    industry: '',
    service_id: '',
    metric_name: '',
    average_value: '',
    top_quartile_value: '',
    data_source: '',
    period: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [benchmarksRes, servicesRes] = await Promise.all([
        supabase
          .from('benchmarks')
          .select('*, service:services(name)')
          .order('industry', { ascending: true }),
        supabase
          .from('services')
          .select('id, name')
          .order('name', { ascending: true })
      ]);

      if (benchmarksRes.error) throw benchmarksRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setBenchmarks(benchmarksRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function openModal(benchmark?: Benchmark) {
    if (benchmark) {
      setEditingBenchmark(benchmark);
      setFormData({
        industry: benchmark.industry,
        service_id: benchmark.service_id,
        metric_name: benchmark.metric_name,
        average_value: benchmark.average_value.toString(),
        top_quartile_value: benchmark.top_quartile_value?.toString() || '',
        data_source: benchmark.data_source || '',
        period: benchmark.period
      });
    } else {
      setEditingBenchmark(null);
      setFormData({
        industry: '',
        service_id: '',
        metric_name: '',
        average_value: '',
        top_quartile_value: '',
        data_source: '',
        period: new Date().toISOString().split('T')[0]
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      industry: formData.industry,
      service_id: formData.service_id,
      metric_name: formData.metric_name,
      average_value: parseFloat(formData.average_value),
      top_quartile_value: formData.top_quartile_value ? parseFloat(formData.top_quartile_value) : null,
      data_source: formData.data_source || null,
      period: formData.period
    };

    try {
      if (editingBenchmark) {
        const { error } = await supabase
          .from('benchmarks')
          .update(data)
          .eq('id', editingBenchmark.id);

        if (error) throw error;
        showToast('Benchmark updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('benchmarks')
          .insert([data]);

        if (error) throw error;
        showToast('Benchmark created successfully', 'success');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this benchmark?')) return;

    try {
      const { error } = await supabase
        .from('benchmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Benchmark deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  const industries = Array.from(new Set(benchmarks.map(b => b.industry))).sort();

  const filteredBenchmarks = benchmarks.filter(benchmark => {
    const matchesSearch =
      benchmark.metric_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      benchmark.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = filterIndustry === 'all' || benchmark.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Performance Benchmarks</h1>
          <p className="text-sm text-muted-foreground">Industry benchmarks for performance comparison</p>
        </div>
        <Button data-testid="button-add-benchmark" onClick={() => openModal()}>
          <Plus className="h-4 w-4" />
          Add Benchmark
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                data-testid="input-search-benchmarks"
                type="text"
                placeholder="Search benchmarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterIndustry} onValueChange={setFilterIndustry}>
              <SelectTrigger data-testid="select-filter-industry" className="w-[200px]">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ) : filteredBenchmarks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg text-muted-foreground">No benchmarks found</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first industry benchmark to start tracking</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Industry</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Top Quartile</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBenchmarks.map((benchmark) => (
                  <TableRow key={benchmark.id} data-testid={`row-benchmark-${benchmark.id}`}>
                    <TableCell className="font-medium text-foreground">
                      {benchmark.industry}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {benchmark.service?.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {benchmark.metric_name}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {benchmark.average_value}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {benchmark.top_quartile_value || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {benchmark.data_source || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(benchmark.period).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          data-testid={`button-edit-benchmark-${benchmark.id}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => openModal(benchmark)}
                          aria-label="Edit benchmark"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          data-testid={`button-delete-benchmark-${benchmark.id}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(benchmark.id)}
                          aria-label="Delete benchmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBenchmark ? 'Edit Benchmark' : 'Add Benchmark'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Input
                data-testid="input-benchmark-industry"
                type="text"
                required
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Healthcare, Finance"
              />
            </div>

            <div className="space-y-2">
              <Label>Service *</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => setFormData({ ...formData, service_id: value })}
              >
                <SelectTrigger data-testid="select-benchmark-service">
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
              <Label>Metric Name *</Label>
              <Input
                data-testid="input-benchmark-metric"
                type="text"
                required
                value={formData.metric_name}
                onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                placeholder="e.g., Click-Through Rate, Conversion Rate"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Average Value *</Label>
                <Input
                  data-testid="input-benchmark-average"
                  type="number"
                  step="0.01"
                  required
                  value={formData.average_value}
                  onChange={(e) => setFormData({ ...formData, average_value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Top Quartile Value</Label>
                <Input
                  data-testid="input-benchmark-top-quartile"
                  type="number"
                  step="0.01"
                  value={formData.top_quartile_value}
                  onChange={(e) => setFormData({ ...formData, top_quartile_value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data Source</Label>
              <Input
                data-testid="input-benchmark-source"
                type="text"
                value={formData.data_source}
                onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                placeholder="e.g., Industry Report 2024, Internal Data"
              />
            </div>

            <div className="space-y-2">
              <Label>Period *</Label>
              <Input
                data-testid="input-benchmark-period"
                type="date"
                required
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                data-testid="button-cancel-benchmark"
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button data-testid="button-submit-benchmark" type="submit">
                {editingBenchmark ? 'Update' : 'Create'} Benchmark
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
