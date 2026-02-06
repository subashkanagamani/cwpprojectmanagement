import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BudgetAlert {
  client_id: string;
  service_id: string;
  monthly_budget: number;
  actual_spending: number;
  utilization: number;
  alert_level: 'warning' | 'critical' | 'exceeded';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: budgets, error: budgetsError } = await supabase
      .from("client_budgets")
      .select(`
        id,
        client_id,
        service_id,
        monthly_budget,
        actual_spending,
        clients!inner(name, company),
        services!inner(name)
      `)
      .is("deleted_at", null)
      .gte("end_date", new Date().toISOString().split('T')[0]);

    if (budgetsError) {
      throw budgetsError;
    }

    const alerts: BudgetAlert[] = [];
    const notifications = [];

    for (const budget of budgets || []) {
      const utilization = budget.monthly_budget > 0
        ? (budget.actual_spending / budget.monthly_budget) * 100
        : 0;

      let alertLevel: 'warning' | 'critical' | 'exceeded' | null = null;
      let message = '';

      if (utilization >= 100) {
        alertLevel = 'exceeded';
        message = `Budget exceeded for ${budget.clients.company} - ${budget.services.name}. Utilization: ${utilization.toFixed(1)}%`;
      } else if (utilization >= 90) {
        alertLevel = 'critical';
        message = `Critical: Budget at ${utilization.toFixed(1)}% for ${budget.clients.company} - ${budget.services.name}`;
      } else if (utilization >= 80) {
        alertLevel = 'warning';
        message = `Warning: Budget at ${utilization.toFixed(1)}% for ${budget.clients.company} - ${budget.services.name}`;
      }

      if (alertLevel) {
        alerts.push({
          client_id: budget.client_id,
          service_id: budget.service_id,
          monthly_budget: budget.monthly_budget,
          actual_spending: budget.actual_spending,
          utilization,
          alert_level: alertLevel,
        });

        const { data: existingAlert } = await supabase
          .from("budget_alerts")
          .select("id")
          .eq("client_id", budget.client_id)
          .eq("service_id", budget.service_id)
          .eq("alert_type", alertLevel)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existingAlert) {
          const { error: alertError } = await supabase
            .from("budget_alerts")
            .insert({
              client_id: budget.client_id,
              service_id: budget.service_id,
              alert_type: alertLevel,
              threshold_percentage: utilization,
              message,
            });

          if (!alertError) {
            const { data: admins } = await supabase
              .from("profiles")
              .select("id")
              .eq("role", "admin")
              .eq("is_active", true)
              .is("deleted_at", null);

            if (admins) {
              for (const admin of admins) {
                notifications.push({
                  user_id: admin.id,
                  title: `Budget Alert: ${alertLevel.toUpperCase()}`,
                  message,
                  type: 'budget_alert',
                  priority: alertLevel === 'exceeded' ? 'high' : 'medium',
                });
              }
            }
          }
        }
      }
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: budgets?.length || 0,
        alerts: alerts.length,
        notifications_created: notifications.length,
        details: alerts,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error checking budgets:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
