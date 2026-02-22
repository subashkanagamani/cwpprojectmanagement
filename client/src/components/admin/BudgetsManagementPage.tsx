import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Budget {
  id: string;
  client_id: string;
  service_id: string | null;
  monthly_budget: number;
  actual_spending: number;
  budget_utilization: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  clients?: {
    name: string;
  };
  services?: {
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

export default function BudgetsManagementPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    monthly_budget: '',
    actual_spending: '0',
    currency: 'USD',
    start_date: '',
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [budgetsRes, clientsRes, servicesRes] = await Promise.all([
        supabase
          .from('client_budgets')
          .select('*, clients(name), services(name)')
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('services').select('id, name').order('name'),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setBudgets(budgetsRes.data || []);
      setClients(clientsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormData({
      client_id: '',
      service_id: '',
      monthly_budget: '',
      actual_spending: '0',
      currency: 'USD',
      start_date: '',
      end_date: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      client_id: budget.client_id,
      service_id: budget.service_id || '',
      monthly_budget: budget.monthly_budget.toString(),
      actual_spending: budget.actual_spending.toString(),
      currency: budget.currency,
      start_date: budget.start_date,
      end_date: budget.end_date || '',
      notes: budget.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.monthly_budget || !formData.start_date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const monthlyBudget = parseFloat(formData.monthly_budget);
      const actualSpending = parseFloat(formData.actual_spending);
      const budgetUtilization = monthlyBudget > 0 ? (actualSpending / monthlyBudget) * 100 : 0;

      const budgetData = {
        client_id: formData.client_id,
        service_id: formData.service_id || null,
        monthly_budget: monthlyBudget,
        actual_spending: actualSpending,
        budget_utilization: budgetUtilization,
        currency: formData.currency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('client_budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);

        if (error) throw error;
        showToast('Budget updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('client_budgets')
          .insert([budgetData]);

        if (error) throw error;
        showToast('Budget created successfully', 'success');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      const { error } = await supabase
        .from('client_budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Budget deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const getUtilizationBadge = (utilization: number) => {
    if (utilization >= 100) {
      return <Badge variant="destructive">Over Budget ({utilization.toFixed(1)}%)</Badge>;
    } else if (utilization >= 80) {
      return <Badge className="bg-yellow-500 text-white">Warning ({utilization.toFixed(1)}%)</Badge>;
    } else {
      return <Badge variant="default">On Track ({utilization.toFixed(1)}%)</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget Management</h1>
          <p className="text-muted-foreground mt-1">Manage client budgets and track spending</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        {budgets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="h-8 w-8 opacity-40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No budgets configured</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first budget to start tracking</p>
            </CardContent>
          </Card>
        ) : (
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
                    <TableRow key={budget.id} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                      <TableCell className="font-medium text-foreground">{budget.clients?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{budget.services?.name || 'All Services'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {budget.monthly_budget.toLocaleString()} {budget.currency}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {budget.actual_spending > budget.monthly_budget ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-foreground">
                            {budget.actual_spending.toLocaleString()} {budget.currency}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getUtilizationBadge(budget.budget_utilization)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-foreground">{format(parseISO(budget.start_date), 'MMM d, yyyy')}</div>
                          {budget.end_date && (
                            <div className="text-muted-foreground">
                              to {format(parseISO(budget.end_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(budget)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(budget.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
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
                <Label htmlFor="service_id">Service (Optional)</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="monthly_budget">Monthly Budget *</Label>
                <Input
                  id="monthly_budget"
                  type="number"
                  step="0.01"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="actual_spending">Actual Spending</Label>
                <Input
                  id="actual_spending"
                  type="number"
                  step="0.01"
                  value={formData.actual_spending}
                  onChange={(e) => setFormData({ ...formData, actual_spending: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBudget ? 'Update Budget' : 'Create Budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
