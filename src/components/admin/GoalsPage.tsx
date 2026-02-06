import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Target, Plus, X, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';

interface Goal {
  id: string;
  client_id: string;
  service_id: string | null;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  start_date: string;
  target_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  clients?: { name: string };
  services?: { name: string };
}

export function GoalsPage() {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    title: '',
    description: '',
    target_value: '',
    current_value: '0',
    unit: '',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    status: 'active' as Goal['status'],
    priority: 'medium' as Goal['priority'],
  });

  useEffect(() => {
    loadGoals();
    loadClients();
    loadServices();
  }, []);

  const loadGoals = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*, clients(name), services(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading goals:', error);
      showToast('Failed to load goals', 'error');
    } else {
      setGoals(data || []);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    if (data) setClients(data);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setServices(data);
  };

  const openModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        client_id: goal.client_id,
        service_id: goal.service_id || '',
        title: goal.title,
        description: goal.description || '',
        target_value: goal.target_value?.toString() || '',
        current_value: goal.current_value.toString(),
        unit: goal.unit || '',
        start_date: goal.start_date,
        target_date: goal.target_date,
        status: goal.status,
        priority: goal.priority,
      });
    } else {
      setEditingGoal(null);
      setFormData({
        client_id: '',
        service_id: '',
        title: '',
        description: '',
        target_value: '',
        current_value: '0',
        unit: '',
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
        status: 'active',
        priority: 'medium',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const goalData = {
      ...formData,
      service_id: formData.service_id || null,
      target_value: formData.target_value ? Number(formData.target_value) : null,
      current_value: Number(formData.current_value),
      unit: formData.unit || null,
      created_by: editingGoal ? undefined : user.id,
    };

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id);
        if (error) throw error;
        showToast('Goal updated successfully', 'success');
      } else {
        const { error } = await supabase.from('goals').insert(goalData);
        if (error) throw error;
        showToast('Goal created successfully', 'success');
      }
      setShowModal(false);
      loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      showToast('Failed to save goal', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active': return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'on_hold': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'cancelled': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  const getProgress = (goal: Goal) => {
    if (!goal.target_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const filteredGoals = filterStatus === 'all'
    ? goals
    : goals.filter(g => g.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-1">Track client objectives and milestones</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Add Goal
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        {['all', 'active', 'completed', 'on_hold', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid gap-6 max-h-[600px] overflow-y-auto">
        {filteredGoals.map(goal => (
          <div key={goal.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(goal.status)}
                  <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    goal.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    goal.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    goal.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {goal.priority}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{goal.clients?.name}</span>
                  {goal.services && <span>• {goal.services.name}</span>}
                  <span>• {format(new Date(goal.start_date), 'MMM d')} - {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <button
                onClick={() => openModal(goal)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                Edit
              </button>
            </div>

            {goal.description && (
              <p className="text-gray-700 mb-4">{goal.description}</p>
            )}

            {goal.target_value && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${getProgress(goal)}%` }}
                  />
                </div>
                <div className="text-right text-sm text-gray-600 mt-1">
                  {getProgress(goal).toFixed(0)}% complete
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredGoals.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
            <p className="text-gray-600">Create your first goal to start tracking progress</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
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
                  >
                    <option value="">All services</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Value</label>
                  <input
                    type="number"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="leads, $, %"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
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
                  {editingGoal ? 'Update' : 'Create'} Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
