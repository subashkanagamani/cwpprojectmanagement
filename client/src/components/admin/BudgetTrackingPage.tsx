import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, Service, ClientBudget } from '../../lib/database.types';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

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
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Budget Tracking</h1>
          <p className="text-sm text-muted-foreground">Manage client budgets and spending</p>
        </div>
        <Button onClick={() => openModal()} data-testid="button-add-budget">
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Monthly Budget</p>
                <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-budget">${totalBudget.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Budgets</p>
                <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-active-budgets">{budgets.length}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-md">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg per Client</p>
                <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-avg-budget">
                  ${clients.length > 0 ? (totalBudget / clients.length).toFixed(0) : 0}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-md">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Monthly Budget</TableHead>
                <TableHead>Actual Spending</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id} data-testid={`row-budget-${budget.id}`}>
                  <TableCell className="font-medium text-foreground">
                    {budget.client?.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{budget.service?.name}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {budget.currency} {Number(budget.monthly_budget).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {budget.currency} {Number(budget.actual_spending).toLocaleString()}
                  </TableCell>
                  <TableCell>
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
                      <div className="w-full bg-muted rounded-full h-2">
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
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(budget.start_date).toLocaleDateString()} -{' '}
                    {budget.end_date ? new Date(budget.end_date).toLocaleDateString() : 'Ongoing'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openModal(budget)}
                        data-testid={`button-edit-budget-${budget.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(budget.id)}
                        data-testid={`button-delete-budget-${budget.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {budgets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No budgets configured yet. Add your first budget to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'Edit Budget' : 'Add New Budget'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger data-testid="select-budget-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => setFormData({ ...formData, service_id: value })}
              >
                <SelectTrigger data-testid="select-budget-service">
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Monthly Budget</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                  required
                  data-testid="input-monthly-budget"
                />
              </div>

              <div>
                <Label>Actual Spending</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.actual_spending}
                  onChange={(e) => setFormData({ ...formData, actual_spending: e.target.value })}
                  required
                  data-testid="input-actual-spending"
                />
              </div>

              <div>
                <Label>Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger data-testid="select-budget-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  data-testid="input-budget-start-date"
                />
              </div>

              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  data-testid="input-budget-end-date"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="input-budget-notes"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-budget"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-budget">
                {editingBudget ? 'Update Budget' : 'Create Budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
