import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';

interface TimeEntry {
  id: string;
  employee_id: string;
  client_id: string;
  service_id: string;
  description: string | null;
  hours: number;
  date: string;
  is_billable: boolean;
  hourly_rate: number | null;
  profiles?: { full_name: string };
  clients?: { name: string };
  services?: { name: string };
}

export function TimeTrackingPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    client_id: '',
    service_id: '',
    description: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    is_billable: true,
    hourly_rate: '',
  });

  useEffect(() => {
    loadEntries();
    loadEmployees();
    loadClients();
    loadServices();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*, profiles(full_name), clients(name), services(name)')
      .order('date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading time entries:', error);
      showToast('Failed to load time entries', 'error');
    } else {
      setEntries(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'active');
    if (data) setEmployees(data);
  };

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    if (data) setClients(data);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('id, name').eq('is_active', true);
    if (data) setServices(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryData = {
      ...formData,
      hours: Number(formData.hours),
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
    };

    try {
      const { error } = await supabase.from('time_entries').insert(entryData);
      if (error) throw error;
      showToast('Time entry logged successfully', 'success');
      setShowModal(false);
      loadEntries();
    } catch (error) {
      console.error('Error saving time entry:', error);
      showToast('Failed to save time entry', 'error');
    }
  };

  const getTotalHours = () => {
    return entries.reduce((sum, entry) => sum + entry.hours, 0);
  };

  const getTotalRevenue = () => {
    return entries.reduce((sum, entry) => {
      if (entry.is_billable && entry.hourly_rate) {
        return sum + (entry.hours * entry.hourly_rate);
      }
      return sum;
    }, 0);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
          <p className="text-gray-600 mt-1">Log and track time spent on client work</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Log Time
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalHours().toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Billable Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${getTotalRevenue().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-h-[600px] overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Billable</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4 text-sm font-medium">{entry.profiles?.full_name}</td>
                  <td className="px-6 py-4 text-sm">{entry.clients?.name}</td>
                  <td className="px-6 py-4 text-sm">{entry.services?.name}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{entry.hours}h</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      entry.is_billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.is_billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Log Time Entry</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select service</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                  <input
                    type="number"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    step="0.25"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                  <input
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_billable}
                      onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Billable</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="What did you work on?"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Log Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
