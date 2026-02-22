import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Edit,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface ClientFinancials {
  monthly_revenue: number;
  monthly_cost: number;
  updated_at: string;
}

interface ClientRow {
  id: string;
  name: string;
  status: string;
  custom_fields: any;
  assignmentCount: number;
  financials: ClientFinancials;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function HorizontalBarChart({ data, valueKey, label, formatValue }: {
  data: { name: string; value: number }[];
  valueKey: string;
  label: string;
  formatValue: (v: number) => string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
        ) : (
          data.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium truncate max-w-[60%]">{item.name}</span>
                <span className="text-muted-foreground">{formatValue(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.max((item.value / maxValue) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueDashboardPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [editRevenue, setEditRevenue] = useState('');
  const [editCost, setEditCost] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [clientsRes, assignmentsRes] = await Promise.all([
        supabase.from('clients').select('id, name, status, custom_fields').is('deleted_at', null).order('name'),
        supabase.from('client_assignments').select('client_id').eq('is_active', true).is('deleted_at', null),
      ]);

      if (clientsRes.error) throw clientsRes.error;

      const assignmentCounts: Record<string, number> = {};
      (assignmentsRes.data || []).forEach((a: any) => {
        assignmentCounts[a.client_id] = (assignmentCounts[a.client_id] || 0) + 1;
      });

      const rows: ClientRow[] = (clientsRes.data || []).map((c: any) => {
        const cf = (c.custom_fields && typeof c.custom_fields === 'object') ? c.custom_fields : {};
        const fin = cf.financials || {};
        const count = assignmentCounts[c.id] || 0;
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          custom_fields: c.custom_fields,
          assignmentCount: count,
          financials: {
            monthly_revenue: fin.monthly_revenue || 0,
            monthly_cost: fin.monthly_cost || (count * 1500),
            updated_at: fin.updated_at || '',
          },
        };
      });

      setClients(rows);
    } catch (err: any) {
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRevenue = clients.reduce((s, c) => s + c.financials.monthly_revenue, 0);
  const totalCost = clients.reduce((s, c) => s + c.financials.monthly_cost, 0);
  const netProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0
    ? clients.filter(c => c.financials.monthly_revenue > 0).reduce((s, c) => {
        const profit = c.financials.monthly_revenue - c.financials.monthly_cost;
        return s + (profit / c.financials.monthly_revenue) * 100;
      }, 0) / Math.max(clients.filter(c => c.financials.monthly_revenue > 0).length, 1)
    : 0;

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setEditRevenue(String(client.financials.monthly_revenue || ''));
    setEditCost(String(client.financials.monthly_cost || ''));
  };

  const saveFinancials = async () => {
    if (!editingClient) return;
    setSaving(true);
    try {
      const revenue = parseFloat(editRevenue) || 0;
      const cost = parseFloat(editCost) || 0;
      const existingFields = (editingClient.custom_fields && typeof editingClient.custom_fields === 'object') ? editingClient.custom_fields : {};
      const updatedFields = {
        ...existingFields,
        financials: {
          monthly_revenue: revenue,
          monthly_cost: cost,
          updated_at: new Date().toISOString().split('T')[0],
        },
      };

      const { error } = await (supabase
        .from('clients') as any)
        .update({ custom_fields: updatedFields })
        .eq('id', editingClient.id);

      if (error) throw error;

      setClients(prev => prev.map(c =>
        c.id === editingClient.id
          ? { ...c, custom_fields: updatedFields, financials: { monthly_revenue: revenue, monthly_cost: cost, updated_at: updatedFields.financials.updated_at } }
          : c
      ));
      setEditingClient(null);
      showToast('Financials updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const top5ByRevenue = [...clients]
    .sort((a, b) => b.financials.monthly_revenue - a.financials.monthly_revenue)
    .slice(0, 5)
    .filter(c => c.financials.monthly_revenue > 0)
    .map(c => ({ name: c.name, value: c.financials.monthly_revenue }));

  const top5ByMargin = [...clients]
    .filter(c => c.financials.monthly_revenue > 0)
    .map(c => ({
      name: c.name,
      value: Math.round(((c.financials.monthly_revenue - c.financials.monthly_cost) / c.financials.monthly_revenue) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const statCards = [
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-emerald-500' },
    { title: 'Total Costs', value: formatCurrency(totalCost), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-red-500' },
    { title: 'Net Profit', value: formatCurrency(netProfit), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-500' },
    { title: 'Avg Profit Margin', value: `${avgMargin.toFixed(1)}%`, icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-purple-500' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue & Profitability</h1>
          <p className="text-sm text-muted-foreground mt-1">Track revenue, costs, and profit margins per client</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue & Profitability</h1>
          <p className="text-sm text-muted-foreground mt-1">Track revenue, costs, and profit margins per client</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Building2 className="h-3 w-3" />
          {clients.length} Clients
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={`border-l-4 ${card.border} animate-fade-up`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.title}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="animate-fade-up">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Client Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No clients found</p>
              <p className="text-sm mt-1">Add clients to start tracking revenue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead className="text-right">Monthly Revenue</TableHead>
                    <TableHead className="text-right">Monthly Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const profit = client.financials.monthly_revenue - client.financials.monthly_cost;
                    const margin = client.financials.monthly_revenue > 0
                      ? (profit / client.financials.monthly_revenue) * 100
                      : 0;
                    const isPositive = profit >= 0;

                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.assignmentCount} assignment{client.assignmentCount !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {client.financials.monthly_revenue > 0
                            ? formatCurrency(client.financials.monthly_revenue)
                            : <span className="text-muted-foreground text-xs">Not set</span>
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(client.financials.monthly_cost)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {client.financials.monthly_revenue > 0 ? (
                            <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
                              {margin.toFixed(1)}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {client.financials.monthly_revenue > 0 ? (
                            isPositive ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(client)} className="h-8 gap-1.5">
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart
          data={top5ByRevenue}
          valueKey="revenue"
          label="Top 5 Clients by Revenue"
          formatValue={formatCurrency}
        />
        <HorizontalBarChart
          data={top5ByMargin}
          valueKey="margin"
          label="Top 5 Clients by Profit Margin"
          formatValue={(v) => `${v}%`}
        />
      </div>

      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Financials — {editingClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="monthly_revenue">Monthly Revenue ($)</Label>
              <Input
                id="monthly_revenue"
                type="number"
                min="0"
                step="100"
                value={editRevenue}
                onChange={(e) => setEditRevenue(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_cost">Monthly Cost ($)</Label>
              <Input
                id="monthly_cost"
                type="number"
                min="0"
                step="100"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
                placeholder="e.g. 3000"
              />
              {editingClient && editingClient.assignmentCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Estimated cost based on {editingClient.assignmentCount} assignment(s): {formatCurrency(editingClient.assignmentCount * 1500)}/mo
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveFinancials} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}