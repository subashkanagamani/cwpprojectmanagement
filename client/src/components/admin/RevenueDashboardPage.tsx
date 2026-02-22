import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Receipt,
  Info,
} from 'lucide-react';
import { format, differenceInDays, getDaysInMonth, startOfMonth, endOfMonth, isAfter, isBefore, addMonths, parseISO } from 'date-fns';

interface PaymentRecord {
  month: string;
  amount_due: number;
  amount_paid: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  paid_date?: string;
  is_prorata: boolean;
  prorata_days?: number;
  total_days?: number;
}

interface ClientFinancials {
  monthly_revenue: number;
  monthly_cost: number;
  updated_at: string;
  payment_history: PaymentRecord[];
}

interface ClientRow {
  id: string;
  name: string;
  status: string;
  start_date: string;
  custom_fields: any;
  assignmentCount: number;
  financials: ClientFinancials;
  monthlySchedule: PaymentRecord[];
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

function generateMonthlySchedule(
  startDate: string,
  monthlyRevenue: number,
  paymentHistory: PaymentRecord[]
): PaymentRecord[] {
  if (!startDate || monthlyRevenue <= 0) return [];

  const onboardDate = parseISO(startDate);
  const now = new Date();
  const currentMonthEnd = endOfMonth(now);
  const schedule: PaymentRecord[] = [];

  let cursor = startOfMonth(onboardDate);

  while (!isAfter(cursor, currentMonthEnd)) {
    const monthKey = format(cursor, 'yyyy-MM');
    const daysInThisMonth = getDaysInMonth(cursor);
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);

    let amountDue = monthlyRevenue;
    let isProrata = false;
    let prorataDays = daysInThisMonth;
    let totalDays = daysInThisMonth;

    if (format(onboardDate, 'yyyy-MM') === monthKey && onboardDate.getDate() > 1) {
      const remainingDays = differenceInDays(monthEnd, onboardDate) + 1;
      prorataDays = remainingDays;
      amountDue = Math.round((monthlyRevenue / daysInThisMonth) * remainingDays);
      isProrata = true;
    }

    const existingPayment = paymentHistory.find(p => p.month === monthKey);
    const amountPaid = existingPayment?.amount_paid || 0;
    const paidDate = existingPayment?.paid_date;

    let status: 'paid' | 'partial' | 'pending' | 'overdue' = 'pending';
    if (amountPaid >= amountDue) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partial';
    } else if (isBefore(monthEnd, now) && amountPaid === 0) {
      status = 'overdue';
    }

    schedule.push({
      month: monthKey,
      amount_due: amountDue,
      amount_paid: amountPaid,
      status,
      paid_date: paidDate,
      is_prorata: isProrata,
      prorata_days: prorataDays,
      total_days: totalDays,
    });

    cursor = addMonths(cursor, 1);
  }

  return schedule.reverse();
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
  const [saving, setSaving] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, assignmentsRes] = await Promise.all([
        supabase.from('clients').select('id, name, status, start_date, custom_fields').is('deleted_at', null).order('name') as any,
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
        const monthlyRevenue = fin.monthly_revenue || 0;
        const paymentHistory = fin.payment_history || [];
        const schedule = generateMonthlySchedule(c.start_date, monthlyRevenue, paymentHistory);

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          start_date: c.start_date || '',
          custom_fields: c.custom_fields,
          assignmentCount: count,
          financials: {
            monthly_revenue: monthlyRevenue,
            monthly_cost: fin.monthly_cost || (count * 1500),
            updated_at: fin.updated_at || '',
            payment_history: paymentHistory,
          },
          monthlySchedule: schedule,
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

  const filteredSchedules = useMemo(() => {
    return clients
      .filter(c => c.financials.monthly_revenue > 0)
      .map(c => {
        const monthEntry = c.monthlySchedule.find(s => s.month === selectedMonthFilter);
        return { client: c, entry: monthEntry };
      })
      .filter(x => x.entry);
  }, [clients, selectedMonthFilter]);

  const totalRevenue = clients.reduce((s, c) => s + c.financials.monthly_revenue, 0);
  const totalCost = clients.reduce((s, c) => s + c.financials.monthly_cost, 0);
  const netProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0
    ? clients.filter(c => c.financials.monthly_revenue > 0).reduce((s, c) => {
        const profit = c.financials.monthly_revenue - c.financials.monthly_cost;
        return s + (profit / c.financials.monthly_revenue) * 100;
      }, 0) / Math.max(clients.filter(c => c.financials.monthly_revenue > 0).length, 1)
    : 0;

  const monthDueTotal = filteredSchedules.reduce((s, x) => s + (x.entry?.amount_due || 0), 0);
  const monthPaidTotal = filteredSchedules.reduce((s, x) => s + (x.entry?.amount_paid || 0), 0);
  const monthOutstanding = monthDueTotal - monthPaidTotal;

  const totalOutstanding = clients.reduce((s, c) => {
    return s + c.monthlySchedule
      .filter(m => m.status === 'overdue' || m.status === 'partial' || m.status === 'pending')
      .reduce((ms, m) => ms + (m.amount_due - m.amount_paid), 0);
  }, 0);
  const overdueClients = clients.filter(c => c.monthlySchedule.some(m => m.status === 'overdue'));

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    clients.forEach(c => c.monthlySchedule.forEach(s => months.add(s.month)));
    return Array.from(months).sort().reverse();
  }, [clients]);

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setEditRevenue(String(client.financials.monthly_revenue || ''));
    setEditCost(String(client.financials.monthly_cost || ''));
    setPaymentMonth('');
    setPaymentAmount('');
  };

  const saveFinancials = async () => {
    if (!editingClient) return;
    setSaving(true);
    try {
      const revenue = parseFloat(editRevenue) || 0;
      const cost = parseFloat(editCost) || 0;
      const existingFields = (editingClient.custom_fields && typeof editingClient.custom_fields === 'object') ? editingClient.custom_fields : {};
      const existingHistory: PaymentRecord[] = editingClient.financials.payment_history || [];

      let updatedHistory = [...existingHistory];
      if (paymentMonth && paymentAmount) {
        const pmtAmt = parseFloat(paymentAmount) || 0;
        const schedule = generateMonthlySchedule(editingClient.start_date, revenue, existingHistory);
        const monthEntry = schedule.find(s => s.month === paymentMonth);
        const amountDue = monthEntry?.amount_due || revenue;

        const existingIdx = updatedHistory.findIndex(h => h.month === paymentMonth);
        const record: PaymentRecord = {
          month: paymentMonth,
          amount_due: amountDue,
          amount_paid: pmtAmt,
          status: pmtAmt >= amountDue ? 'paid' : pmtAmt > 0 ? 'partial' : 'pending',
          paid_date: new Date().toISOString().split('T')[0],
          is_prorata: monthEntry?.is_prorata || false,
          prorata_days: monthEntry?.prorata_days,
          total_days: monthEntry?.total_days,
        };

        if (existingIdx >= 0) {
          updatedHistory[existingIdx] = record;
        } else {
          updatedHistory.push(record);
        }
        updatedHistory.sort((a, b) => b.month.localeCompare(a.month));
      }

      const updatedFields = {
        ...existingFields,
        financials: {
          monthly_revenue: revenue,
          monthly_cost: cost,
          updated_at: new Date().toISOString().split('T')[0],
          payment_history: updatedHistory,
        },
      };

      const { error } = await (supabase.from('clients') as any)
        .update({ custom_fields: updatedFields })
        .eq('id', editingClient.id);

      if (error) throw error;

      showToast('Financials updated successfully', 'success');
      setEditingClient(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (clientId: string, month: string, amount: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    try {
      const existingFields = (client.custom_fields && typeof client.custom_fields === 'object') ? client.custom_fields : {};
      const existingHistory: PaymentRecord[] = client.financials.payment_history || [];
      const monthEntry = client.monthlySchedule.find(s => s.month === month);
      const amountDue = monthEntry?.amount_due || client.financials.monthly_revenue;

      let updatedHistory = [...existingHistory];
      const existingIdx = updatedHistory.findIndex(h => h.month === month);
      const record: PaymentRecord = {
        month,
        amount_due: amountDue,
        amount_paid: amount,
        status: amount >= amountDue ? 'paid' : amount > 0 ? 'partial' : 'pending',
        paid_date: new Date().toISOString().split('T')[0],
        is_prorata: monthEntry?.is_prorata || false,
        prorata_days: monthEntry?.prorata_days,
        total_days: monthEntry?.total_days,
      };

      if (existingIdx >= 0) {
        updatedHistory[existingIdx] = record;
      } else {
        updatedHistory.push(record);
      }

      const updatedFields = {
        ...existingFields,
        financials: {
          ...existingFields.financials,
          payment_history: updatedHistory,
          updated_at: new Date().toISOString().split('T')[0],
        },
      };

      const { error } = await (supabase.from('clients') as any)
        .update({ custom_fields: updatedFields })
        .eq('id', clientId);

      if (error) throw error;
      showToast('Payment recorded', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
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
      value: c.monthlySchedule
        .filter(m => m.status !== 'paid')
        .reduce((s, m) => s + (m.amount_due - m.amount_paid), 0),
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8">
        <div><Skeleton className="h-7 w-64 mb-2" /><Skeleton className="h-4 w-80" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (<Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>))}
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
          <p className="text-sm text-muted-foreground mt-1">Monthly billing with pro-rata calculation from onboarding date</p>
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
                <p className="text-[13px] font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight text-emerald-600">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{avgMargin.toFixed(1)}% avg margin</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">cost: {formatCurrency(totalCost)}</p>
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
                <p className="text-[13px] font-medium text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight text-orange-600">{formatCurrency(totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{overdueClients.length} with overdue</p>
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
                <p className="text-[13px] font-medium text-muted-foreground">{format(parseISO(selectedMonthFilter + '-01'), 'MMM yyyy')}</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight text-violet-600">{formatCurrency(monthDueTotal)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(monthPaidTotal)} collected
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/30">
                <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <TabsList className="mb-4">
          <TabsTrigger value="monthly">Monthly Payments</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="schedule">Full Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Payment Status — {format(parseISO(selectedMonthFilter + '-01'), 'MMMM yyyy')}</CardTitle>
                <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(m => (
                      <SelectItem key={m} value={m}>{format(parseISO(m + '-01'), 'MMM yyyy')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-5 p-3 rounded-lg bg-muted/50">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Due This Month</p>
                  <p className="text-lg font-semibold mt-0.5">{formatCurrency(monthDueTotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-lg font-semibold mt-0.5 text-emerald-600">{formatCurrency(monthPaidTotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className={`text-lg font-semibold mt-0.5 ${monthOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(monthOutstanding)}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Onboarded</TableHead>
                      <TableHead className="text-right">Due Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Collection</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No payments due for this month</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchedules
                        .sort((a, b) => {
                          const order = { overdue: 0, pending: 1, partial: 2, paid: 3 };
                          return (order[a.entry!.status] || 1) - (order[b.entry!.status] || 1);
                        })
                        .map(({ client, entry }) => {
                          if (!entry) return null;
                          const balance = entry.amount_due - entry.amount_paid;
                          const collPct = entry.amount_due > 0 ? (entry.amount_paid / entry.amount_due) * 100 : 0;
                          const statusCfg = getPaymentStatusConfig(entry.status);
                          const StatusIcon = statusCfg.icon;
                          return (
                            <TableRow key={client.id} className={entry.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {client.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{client.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{formatCurrency(client.financials.monthly_revenue)}/mo</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {client.start_date ? format(parseISO(client.start_date), 'MMM d, yyyy') : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div>
                                  <span className="text-sm font-medium">{formatCurrency(entry.amount_due)}</span>
                                  {entry.is_prorata && (
                                    <div className="flex items-center gap-1 justify-end mt-0.5">
                                      <Info className="h-3 w-3 text-blue-500" />
                                      <span className="text-[10px] text-blue-600">Pro-rata: {entry.prorata_days}/{entry.total_days} days</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-emerald-600">
                                {formatCurrency(entry.amount_paid)}
                              </TableCell>
                              <TableCell className={`text-right text-sm font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatCurrency(balance)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={statusCfg.variant} className="text-[11px] gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {statusCfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="w-16 mx-auto">
                                  <Progress value={Math.min(collPct, 100)} className="h-1.5" />
                                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">{collPct.toFixed(0)}%</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {entry.status !== 'paid' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => {
                                      const amt = prompt(`Record payment for ${client.name} (${format(parseISO(entry.month + '-01'), 'MMM yyyy')})\nDue: ${formatCurrency(entry.amount_due)}\nEnter amount received:`);
                                      if (amt) {
                                        const parsedAmt = parseFloat(amt);
                                        if (!isNaN(parsedAmt) && parsedAmt > 0) {
                                          recordPayment(client.id, entry.month, parsedAmt);
                                        }
                                      }
                                    }}
                                  >
                                    <Receipt className="h-3 w-3" />
                                    Record
                                  </Button>
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <HorizontalBarChart data={top5Outstanding} label="Top Outstanding Amounts" formatValue={formatCurrency} />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] font-semibold">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3">
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Collected</p>
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatCurrency(clients.reduce((s, c) => s + c.monthlySchedule.reduce((ms, m) => ms + m.amount_paid, 0), 0))}
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
                    { label: 'Fully Paid', count: filteredSchedules.filter(x => x.entry?.status === 'paid').length, color: 'bg-emerald-500' },
                    { label: 'Partial', count: filteredSchedules.filter(x => x.entry?.status === 'partial').length, color: 'bg-amber-500' },
                    { label: 'Pending', count: filteredSchedules.filter(x => x.entry?.status === 'pending').length, color: 'bg-gray-400' },
                    { label: 'Overdue', count: filteredSchedules.filter(x => x.entry?.status === 'overdue').length, color: 'bg-red-500' },
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

        <TabsContent value="profitability">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-[15px] font-semibold">Client Profitability</CardTitle>
                <Badge variant="outline" className="text-[11px]">{clients.filter(c => c.financials.monthly_revenue > 0).length} with revenue</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Onboarded</TableHead>
                      <TableHead className="text-right">Revenue/mo</TableHead>
                      <TableHead className="text-right">Cost/mo</TableHead>
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
                          <TableCell className="text-xs text-muted-foreground">
                            {client.start_date ? format(parseISO(client.start_date), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {client.financials.monthly_revenue > 0
                              ? formatCurrency(client.financials.monthly_revenue)
                              : <span className="text-muted-foreground text-xs">Not set</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(client.financials.monthly_cost)}</TableCell>
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
                              <Badge variant={isPositive ? 'default' : 'destructive'} className="text-[11px]">{margin.toFixed(1)}%</Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(client)} className="h-7 text-xs gap-1">
                              <Edit className="h-3 w-3" /> Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <HorizontalBarChart data={top5ByRevenue} label="Top 5 by Revenue" formatValue={formatCurrency} />
            <HorizontalBarChart data={top5ByMargin} label="Top 5 by Profit Margin" formatValue={(v) => `${v}%`} />
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">Full Payment Schedule (All Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {clients.filter(c => c.monthlySchedule.length > 0).length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No payment schedules generated yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Set monthly revenue for clients with onboarding dates</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {clients
                    .filter(c => c.monthlySchedule.length > 0)
                    .map(client => {
                      const isExpanded = expandedClient === client.id;
                      const totalDue = client.monthlySchedule.reduce((s, m) => s + m.amount_due, 0);
                      const totalPaid = client.monthlySchedule.reduce((s, m) => s + m.amount_paid, 0);
                      const overdueCount = client.monthlySchedule.filter(m => m.status === 'overdue').length;

                      return (
                        <div key={client.id} className="rounded-xl border overflow-hidden">
                          <button
                            onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                            className="w-full flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{client.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {client.start_date ? `Since ${format(parseISO(client.start_date), 'MMM d, yyyy')}` : 'No start date'} &middot; {formatCurrency(client.financials.monthly_revenue)}/mo
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right hidden md:block">
                                <p className="text-xs text-muted-foreground">Due / Paid</p>
                                <p className="text-sm font-medium">{formatCurrency(totalDue)} / <span className="text-emerald-600">{formatCurrency(totalPaid)}</span></p>
                              </div>
                              {overdueCount > 0 && (
                                <Badge variant="destructive" className="text-[10px]">{overdueCount} overdue</Badge>
                              )}
                              <ChevronIcon expanded={isExpanded} />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t max-h-[350px] overflow-y-auto scrollbar-thin">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Due</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead>Paid Date</TableHead>
                                    <TableHead className="text-center">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {client.monthlySchedule.map((record) => {
                                    const balance = record.amount_due - record.amount_paid;
                                    const pCfg = getPaymentStatusConfig(record.status);
                                    return (
                                      <TableRow key={record.month} className={record.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                                        <TableCell>
                                          <div>
                                            <span className="text-sm font-medium">{format(parseISO(record.month + '-01'), 'MMM yyyy')}</span>
                                            {record.is_prorata && (
                                              <p className="text-[10px] text-blue-600 flex items-center gap-0.5 mt-0.5">
                                                <Info className="h-2.5 w-2.5" />
                                                Pro-rata ({record.prorata_days}/{record.total_days} days)
                                              </p>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm">{formatCurrency(record.amount_due)}</TableCell>
                                        <TableCell className="text-right text-sm text-emerald-600 font-medium">{formatCurrency(record.amount_paid)}</TableCell>
                                        <TableCell className={`text-right text-sm font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                          {formatCurrency(balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant={pCfg.variant} className="text-[11px]">{pCfg.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{record.paid_date || '—'}</TableCell>
                                        <TableCell className="text-center">
                                          {record.status !== 'paid' ? (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-6 text-[11px] px-2"
                                              onClick={() => {
                                                const amt = prompt(`Record payment for ${format(parseISO(record.month + '-01'), 'MMM yyyy')}\nDue: ${formatCurrency(record.amount_due)}\nEnter amount:`);
                                                if (amt) {
                                                  const parsedAmt = parseFloat(amt);
                                                  if (!isNaN(parsedAmt) && parsedAmt > 0) {
                                                    recordPayment(client.id, record.month, parsedAmt);
                                                  }
                                                }
                                              }}
                                            >
                                              Record
                                            </Button>
                                          ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
            {editingClient?.start_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Onboarded: {format(parseISO(editingClient.start_date), 'MMMM d, yyyy')}
                {(() => {
                  const d = parseISO(editingClient.start_date);
                  if (d.getDate() > 1) {
                    const daysInMonth = getDaysInMonth(d);
                    const remaining = daysInMonth - d.getDate() + 1;
                    return ` (first month pro-rata: ${remaining}/${daysInMonth} days)`;
                  }
                  return ' (full first month)';
                })()}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Revenue & Costs</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Revenue (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={editRevenue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditRevenue(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Cost (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Record Payment</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Month</Label>
                  <Input
                    type="month"
                    value={paymentMonth}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentMonth(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount Received (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={paymentAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>
              {paymentMonth && editRevenue && editingClient?.start_date && (
                <p className="text-[11px] text-blue-600 mt-1.5">
                  {(() => {
                    const rev = parseFloat(editRevenue) || 0;
                    const schedule = generateMonthlySchedule(editingClient.start_date, rev, editingClient.financials.payment_history);
                    const entry = schedule.find(s => s.month === paymentMonth);
                    if (entry?.is_prorata) {
                      return `Pro-rata for this month: ${formatCurrency(entry.amount_due)} (${entry.prorata_days}/${entry.total_days} days)`;
                    }
                    return `Full month due: ${formatCurrency(entry?.amount_due || rev)}`;
                  })()}
                </p>
              )}
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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
