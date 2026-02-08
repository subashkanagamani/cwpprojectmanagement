import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface BudgetAlert {
  id: string;
  budget_id: string;
  alert_type: 'warning' | 'critical';
  threshold_percentage: number;
  message: string;
  is_active: boolean;
  created_at: string;
  budget?: {
    client_id: string;
    allocated_budget: number;
    actual_spending: number;
    client?: {
      name: string;
    };
  };
}

interface BudgetAlertsProps {
  showOnlyActive?: boolean;
  clientId?: string;
}

export function BudgetAlerts({ showOnlyActive = true, clientId }: BudgetAlertsProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [clientId]);

  async function loadAlerts() {
    try {
      let query = supabase
        .from('budget_alerts')
        .select(`
          *,
          budget:client_budgets!budget_id(
            client_id,
            allocated_budget,
            actual_spending,
            client:clients!client_id(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (showOnlyActive) {
        query = query.eq('is_active', true);
      }

      if (clientId) {
        query = query.eq('budget.client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading budget alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function dismissAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;

      showToast('Alert dismissed', 'success');
      loadAlerts();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function getAlertColor(type: string) {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-600" />;
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Budget Alerts
      </h3>
      {alerts.map((alert) => {
        const budget = alert.budget;
        const utilization = budget
          ? ((budget.actual_spending / budget.allocated_budget) * 100).toFixed(0)
          : 0;

        return (
          <div
            key={alert.id}
            className={`border rounded-lg p-4 ${getAlertColor(alert.alert_type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">{getAlertIcon(alert.alert_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {budget?.client?.name} - Budget Alert
                    </p>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span>
                        Budget: ${budget?.allocated_budget.toLocaleString()}
                      </span>
                      <span>
                        Spent: ${budget?.actual_spending.toLocaleString()}
                      </span>
                      <span>
                        Utilization: {utilization}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 hover:bg-white/50 rounded transition flex-shrink-0"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
