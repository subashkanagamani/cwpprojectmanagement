import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Edit2, Trash2, X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

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
  const [filterIndustry, setFilterIndustry] = useState('');
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
    const matchesIndustry = !filterIndustry || benchmark.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-blue-600" />
          Performance Benchmarks
        </h1>
        <p className="text-gray-600 mt-1">Industry benchmarks for performance comparison</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search benchmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Industries</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Benchmark
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading benchmarks...</p>
        </div>
      ) : filteredBenchmarks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No benchmarks found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first industry benchmark to start tracking</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top Quartile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBenchmarks.map((benchmark) => (
                  <tr key={benchmark.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {benchmark.industry}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {benchmark.service?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {benchmark.metric_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {benchmark.average_value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {benchmark.top_quartile_value || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {benchmark.data_source || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(benchmark.period).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(benchmark)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        aria-label="Edit benchmark"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(benchmark.id)}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Delete benchmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingBenchmark ? 'Edit Benchmark' : 'Add Benchmark'}
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
                  Industry *
                </label>
                <input
                  type="text"
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Technology, Healthcare, Finance"
                />
              </div>

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
                  placeholder="e.g., Click-Through Rate, Conversion Rate"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Average Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.average_value}
                    onChange={(e) => setFormData({ ...formData, average_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Top Quartile Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.top_quartile_value}
                    onChange={(e) => setFormData({ ...formData, top_quartile_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Source
                </label>
                <input
                  type="text"
                  value={formData.data_source}
                  onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Industry Report 2024, Internal Data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period *
                </label>
                <input
                  type="date"
                  required
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  {editingBenchmark ? 'Update' : 'Create'} Benchmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
