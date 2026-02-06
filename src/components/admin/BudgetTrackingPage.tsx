import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Service, ClientBudget } from '../../lib/database.types';
import { Plus, Edit2, Trash2, X, DollarSign } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface BudgetWithDetails extends ClientBudget {
  client?: Client;
  service?: Service;
}

export function BudgetTrackingPage() {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ClientBudget | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    monthly_budget: '',
    actual_spending: '',
    currency: 'USD',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsRes, clientsRes, servicesRes] = await Promise.all([
        supabase.from('client_budgets').select(`
          *,
          clients(*),
          services(*)
        `).order('created_at', { ascending: false }),
        supabase.from('clients').select('*').eq('status', 'active'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);

      if (budgetsRes.data) {
        const budgetsWithDetails = budgetsRes.data.map((budget: any) => ({
          ...budget,
          client: budget.clients,
          service: budget.services,
        }));
        setBudgets(budgetsWithDetails);
      }

      if (clientsRes.data) setClients(clientsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (budget?: ClientBudget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        client_id: budget.client_id,
        service_id: budget.service_id,
        monthly_budget: budget.monthly_budget.toString(),
        actual_spending: budget.actual_spending?.toString() || '0',
        currency: budget.currency,
        start_date: budget.start_date,
        end_date: budget.end_date || '',
        notes: budget.notes || '',
      });
    } else {
      setEditingBudget(null);
      setFormData({
        client_id: '',
        service_id: '',
        monthly_budget: '',
        actual_spending: '0',
        currency: 'USD',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const budgetData = {
        client_id: formData.client_id,
        service_id: formData.service_id,
        monthly_budget: parseFloat(formData.monthly_budget),
        actual_spending: parseFloat(formData.actual_spending) || 0,
        currency: formData.currency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null,
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('client_budgets')
          .update({ ...budgetData, updated_at: new Date().toISOString() })
          .eq('id', editingBudget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_budgets').insert(budgetData);
        if (error) throw error;
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      showToast('Failed to save budget', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      const { error } = await supabase.from('client_budgets').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.monthly_budget), 0);

  if (loading) {
    return <div className="text-center py-12">Loading budgets...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Tracking</h1>
          <p className="text-gray-600 mt-1">Manage client budgets and spending</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Add Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Monthly Budget</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${totalBudget.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Budgets</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{budgets.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg per Client</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${clients.length > 0 ? (totalBudget / clients.length).toFixed(0) : 0}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Monthly Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actual Spending
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Utilization
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {budgets.map((budget) => (
              <tr key={budget.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {budget.client?.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{budget.service?.name}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  {budget.currency} {Number(budget.monthly_budget).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {budget.currency} {Number(budget.actual_spending).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${
                        budget.budget_utilization >= 100 ? 'text-red-600' :
                        budget.budget_utilization >= 75 ? 'text-orange-600' :
                        budget.budget_utilization >= 50 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {Number(budget.budget_utilization).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          budget.budget_utilization >= 100 ? 'bg-red-600' :
                          budget.budget_utilization >= 75 ? 'bg-orange-500' :
                          budget.budget_utilization >= 50 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budget.budget_utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(budget.start_date).toLocaleDateString()} -{' '}
                  {budget.end_date ? new Date(budget.end_date).toLocaleDateString() : 'Ongoing'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openModal(budget)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No budgets configured yet. Add your first budget to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBudget ? 'Edit Budget' : 'Add New Budget'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                <select
                  value={formData.service_id}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Budget
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Spending
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actual_spending}
                    onChange={(e) => setFormData({ ...formData, actual_spending: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
