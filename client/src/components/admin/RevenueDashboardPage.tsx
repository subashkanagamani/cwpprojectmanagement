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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Edit,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';

interface ClientFinancials {
  monthly_revenue: number;
  monthly_cost: number;
  updated_at: string;
  payment_status: 'paid' | 'partial' | 'pending' | 'overdue';
  amount_paid: number;
  due_date: string;
  payment_history: PaymentRecord[];
}

interface PaymentRecord {
  month: string;
  amount_due: number;
  amount_paid: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  paid_date?: string;
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
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function getPaymentStatusConfig(status: string) {
  switch (status) {
    case 'paid': return { label: 'Paid', variant: 'secondary' as const, color: 'text-emerald-600', icon: CheckCircle2 };
    case 'partial': return { label: 'Partial', variant: 'default' as const, color: 'text-amber-600', icon: Clock };
    case 'overdue': return { label: 'Overdue', variant: 'destructive' as const, color: 'text-red-600', icon: AlertTriangle };
    default: return { label: 'Pending', variant: 'outline' as const, color: 'text-muted-foreground', icon: Clock };
  }
}

function HorizontalBarChart({ data, label, formatValue }: {
  data: { name: string; value: number }[];
  label: string;
  formatValue: (v: number) => string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-semibold">{label}</CardTitle>
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
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('pending');
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, assignmentsRes] = await Promise.all([
        supabase.from('clients').select('id, name, status, custom_fields').is('deleted_at', null).order('name') as any,
        supabase.from('client_assignments').select('client_id').eq('is_active', true).is('deleted_at', null) as any,
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
            payment_status: fin.payment_status || 'pending',
            amount_paid: fin.amount_paid || 0,
            due_date: fin.due_date || '',
            payment_history: fin.payment_history || [],
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

  const totalOutstanding = clients.reduce((s, c) => {
    const outstanding = c.financials.monthly_revenue - c.financials.amount_paid;
    return s + (outstanding > 0 ? outstanding : 0);
  }, 0);

  const overdueClients = clients.filter(c => c.financials.payment_status === 'overdue');
  const paidClients = clients.filter(c => c.financials.payment_status === 'paid');
  const collectionRate = totalRevenue > 0
    ? (clients.reduce((s, c) => s + c.financials.amount_paid, 0) / totalRevenue) * 100
    : 0;

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setEditRevenue(String(client.financials.monthly_revenue || ''));
    setEditCost(String(client.financials.monthly_cost || ''));
    setEditPaymentStatus(client.financials.payment_status || 'pending');
    setEditAmountPaid(String(client.financials.amount_paid || ''));
    setEditDueDate(client.financials.due_date || '');
    setPaymentMonth('');
    setPaymentAmount('');
  };

  const saveFinancials = async () => {
    if (!editingClient) return;
    setSaving(true);
    try {
      const revenue = parseFloat(editRevenue) || 0;
      const cost = parseFloat(editCost) || 0;
      const amountPaid = parseFloat(editAmountPaid) || 0;
      const existingFields = (editingClient.custom_fields && typeof editingClient.custom_fields === 'object') ? editingClient.custom_fields : {};
      const existingHistory = editingClient.financials.payment_history || [];

      let updatedHistory = [...existingHistory];
      if (paymentMonth && paymentAmount) {
        const existingIdx = updatedHistory.findIndex(h => h.month === paymentMonth);
        const pmtAmt = parseFloat(paymentAmount) || 0;
        if (existingIdx >= 0) {
          updatedHistory[existingIdx] = {
            ...updatedHistory[existingIdx],
            amount_paid: pmtAmt,
            status: pmtAmt >= updatedHistory[existingIdx].amount_due ? 'paid' : pmtAmt > 0 ? 'partial' : 'pending',
            paid_date: new Date().toISOString().split('T')[0],
          };
        } else {
          updatedHistory.push({
            month: paymentMonth,
            amount_due: revenue,
            amount_paid: pmtAmt,
            status: pmtAmt >= revenue ? 'paid' : pmtAmt > 0 ? 'partial' : 'pending',
            paid_date: new Date().toISOString().split('T')[0],
          });
        }
        updatedHistory.sort((a, b) => b.month.localeCompare(a.month));
      }

      const updatedFields = {
        ...existingFields,
        financials: {
          monthly_revenue: revenue,
          monthly_cost: cost,
          updated_at: new Date().toISOString().split('T')[0],
          payment_status: editPaymentStatus,
          amount_paid: amountPaid,
          due_date: editDueDate,
          payment_history: updatedHistory,
        },
      };

      const { error } = await (supabase.from('clients') as any)
        .update({ custom_fields: updatedFields })
        .eq('id', editingClient.id);

      if (error) throw error;

      setClients(prev => prev.map(c =>
        c.id === editingClient.id
          ? {
              ...c,
              custom_fields: updatedFields,
              financials: updatedFields.financials as ClientFinancials,
            }
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

  const top5Outstanding = [...clients]
    .map(c => ({
      name: c.name,
      value: Math.max(c.financials.monthly_revenue - c.financials.amount_paid, 0),
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Revenue & Profitability</h1>
          <p className="text-sm text-muted-foreground mt-1">Track revenue, costs, payments, and outstanding amounts per client</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Building2 className="h-3 w-3" />
          {clients.length} Clients
        </Badge>
      </div>

      <div className="animate-fade-up grid grid-cols-2 lg:grid-cols-4 gap-5" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight text-emerald-600">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">monthly</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-semibold mt-1 tracking-tight ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{avgMargin.toFixed(1)}% avg margin</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient orange">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight text-orange-600">{formatCurrency(totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{overdueClients.length} overdue</p>
              </div>
              <div className="rounded-lg p-2.5 bg-orange-50 dark:bg-orange-950/30">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight text-violet-600">{collectionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{paidClients.length} fully paid</p>
              </div>
              <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/30">
                <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profitability" className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <TabsList className="mb-4">
          <TabsTrigger value="profitability">Client Profitability</TabsTrigger>
          <TabsTrigger value="payments">Payment Status</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Client Profitability</CardTitle>
                <Badge variant="outline" className="text-[11px]">{clients.filter(c => c.financials.monthly_revenue > 0).length} with revenue</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No clients found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => {
                        const profit = client.financials.monthly_revenue - client.financials.monthly_cost;
                        const margin = client.financials.monthly_revenue > 0
                          ? (profit / client.financials.monthly_revenue) * 100 : 0;
                        const isPositive = profit >= 0;
                        return (
                          <TableRow key={client.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{client.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{client.assignmentCount} assignment{client.assignmentCount !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {client.financials.monthly_revenue > 0
                                ? formatCurrency(client.financials.monthly_revenue)
                                : <span className="text-muted-foreground text-xs">Not set</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(client.financials.monthly_cost)}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                              {client.financials.monthly_revenue > 0 ? (
                                <span className="flex items-center justify-end gap-1">
                                  {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                  {formatCurrency(Math.abs(profit))}
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {client.financials.monthly_revenue > 0 ? (
                                <Badge variant={isPositive ? 'default' : 'destructive'} className="text-[11px]">
                                  {margin.toFixed(1)}%
                                </Badge>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(client)} className="h-7 text-xs gap-1">
                                <Edit className="h-3 w-3" />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <HorizontalBarChart data={top5ByRevenue} label="Top 5 by Revenue" formatValue={formatCurrency} />
            <HorizontalBarChart data={top5ByMargin} label="Top 5 by Profit Margin" formatValue={(v) => `${v}%`} />
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Payment Status by Client</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[11px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {paidClients.length} Paid
                  </Badge>
                  <Badge variant="destructive" className="text-[11px] gap-1">
                    <AlertTriangle className="h-3 w-3" /> {overdueClients.length} Overdue
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Monthly Due</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-center">Collection</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients
                      .filter(c => c.financials.monthly_revenue > 0)
                      .sort((a, b) => {
                        const statusOrder = { overdue: 0, pending: 1, partial: 2, paid: 3 };
                        return (statusOrder[a.financials.payment_status] || 1) - (statusOrder[b.financials.payment_status] || 1);
                      })
                      .map((client) => {
                        const outstanding = Math.max(client.financials.monthly_revenue - client.financials.amount_paid, 0);
                        const collPct = client.financials.monthly_revenue > 0
                          ? (client.financials.amount_paid / client.financials.monthly_revenue) * 100 : 0;
                        const statusCfg = getPaymentStatusConfig(client.financials.payment_status);
                        const StatusIcon = statusCfg.icon;
                        return (
                          <TableRow key={client.id} className={client.financials.payment_status === 'overdue' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium truncate">{client.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(client.financials.monthly_revenue)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-emerald-600 font-medium">
                              {formatCurrency(client.financials.amount_paid)}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {formatCurrency(outstanding)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={statusCfg.variant} className="text-[11px] gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {client.financials.due_date ? format(new Date(client.financials.due_date), 'MMM d, yyyy') : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="w-20 mx-auto">
                                <Progress value={Math.min(collPct, 100)} className="h-1.5" />
                                <p className="text-[10px] text-muted-foreground text-center mt-0.5">{collPct.toFixed(0)}%</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(client)} className="h-7 text-xs gap-1">
                                <Edit className="h-3 w-3" />
                                Update
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                    })}
                    {clients.filter(c => c.financials.monthly_revenue > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Set revenue for clients to track payments</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <HorizontalBarChart
              data={top5Outstanding}
              label="Top Outstanding Amounts"
              formatValue={formatCurrency}
            />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] font-semibold">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3">
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Collected</p>
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatCurrency(clients.reduce((s, c) => s + c.financials.amount_paid, 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3">
                    <p className="text-[11px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wider">Total Outstanding</p>
                    <p className="text-lg font-semibold text-red-700 dark:text-red-400 mt-1">
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  {[
                    { label: 'Paid', count: paidClients.length, color: 'bg-emerald-500' },
                    { label: 'Partial', count: clients.filter(c => c.financials.payment_status === 'partial').length, color: 'bg-amber-500' },
                    { label: 'Pending', count: clients.filter(c => c.financials.payment_status === 'pending' && c.financials.monthly_revenue > 0).length, color: 'bg-gray-400' },
                    { label: 'Overdue', count: overdueClients.length, color: 'bg-red-500' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.color}`} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">Monthly Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {clients.filter(c => c.financials.payment_history.length > 0).length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No payment history recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Edit a client's financials and add monthly payment records</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {clients
                    .filter(c => c.financials.payment_history.length > 0)
                    .map(client => (
                      <div key={client.id}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold">{client.name}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead className="text-right">Due</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead>Paid Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {client.financials.payment_history.map((record, idx) => {
                                const pCfg = getPaymentStatusConfig(record.status);
                                return (
                                  <TableRow key={idx}>
                                    <TableCell className="text-sm font-medium">{record.month}</TableCell>
                                    <TableCell className="text-right text-sm">{formatCurrency(record.amount_due)}</TableCell>
                                    <TableCell className="text-right text-sm text-emerald-600 font-medium">{formatCurrency(record.amount_paid)}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant={pCfg.variant} className="text-[11px]">{pCfg.label}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{record.paid_date || '—'}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Financials — {editingClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Revenue & Costs</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Revenue</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={editRevenue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditRevenue(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Cost</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={editCost}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCost(e.target.value)}
                    placeholder="e.g. 30000"
                  />
                </div>
              </div>
              {editingClient && editingClient.assignmentCount > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Est. cost for {editingClient.assignmentCount} assignment(s): {formatCurrency(editingClient.assignmentCount * 1500)}/mo
                </p>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Payment Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Status</Label>
                  <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount Paid</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={editAmountPaid}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditAmountPaid(e.target.value)}
                    placeholder="e.g. 40000"
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">Payment Due Date</Label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Add Monthly Payment Record</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Month (YYYY-MM)</Label>
                  <Input
                    type="month"
                    value={paymentMonth}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentMonth(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount Received</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={paymentAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Optional: Records payment for a specific month in the history tab
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveFinancials} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
