/*
  # Create Budget Alerts Automation

  1. New Functions
    - `check_budget_thresholds()` - Automatically checks budget utilization
    - Creates alerts when budgets exceed thresholds (80%, 100%)

  2. Triggers
    - Trigger on budget updates to check thresholds
    - Automatically creates budget alerts

  3. Changes
    - Automates budget monitoring
    - Creates alerts for budget overages
*/

-- Function to check budget thresholds and create alerts
CREATE OR REPLACE FUNCTION check_budget_thresholds()
RETURNS TRIGGER AS $$
DECLARE
  alert_level text;
  alert_message text;
BEGIN
  -- Calculate utilization percentage
  NEW.budget_utilization := CASE
    WHEN NEW.monthly_budget > 0 THEN (NEW.actual_spending / NEW.monthly_budget) * 100
    ELSE 0
  END;

  -- Check if we need to create an alert
  IF NEW.budget_utilization >= 100 THEN
    alert_level := 'critical';
    alert_message := 'Budget exceeded! Spending is at ' || ROUND(NEW.budget_utilization::numeric, 1) || '% of budget.';
  ELSIF NEW.budget_utilization >= 90 THEN
    alert_level := 'high';
    alert_message := 'Budget warning! Spending is at ' || ROUND(NEW.budget_utilization::numeric, 1) || '% of budget.';
  ELSIF NEW.budget_utilization >= 80 THEN
    alert_level := 'medium';
    alert_message := 'Budget approaching limit. Spending is at ' || ROUND(NEW.budget_utilization::numeric, 1) || '% of budget.';
  ELSE
    -- No alert needed
    RETURN NEW;
  END IF;

  -- Check if an alert already exists for this budget with same level
  IF NOT EXISTS (
    SELECT 1 FROM budget_alerts
    WHERE budget_id = NEW.id
    AND alert_level = check_budget_thresholds.alert_level
    AND created_at > NOW() - INTERVAL '7 days'
  ) THEN
    -- Create the alert
    INSERT INTO budget_alerts (
      budget_id,
      alert_level,
      threshold_percentage,
      current_utilization,
      message,
      is_resolved,
      created_at
    ) VALUES (
      NEW.id,
      alert_level,
      CASE
        WHEN NEW.budget_utilization >= 100 THEN 100
        WHEN NEW.budget_utilization >= 90 THEN 90
        ELSE 80
      END,
      NEW.budget_utilization,
      alert_message,
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic budget alerts
DROP TRIGGER IF EXISTS budget_threshold_check ON client_budgets;
CREATE TRIGGER budget_threshold_check
  BEFORE UPDATE OF actual_spending ON client_budgets
  FOR EACH ROW
  WHEN (OLD.actual_spending IS DISTINCT FROM NEW.actual_spending)
  EXECUTE FUNCTION check_budget_thresholds();

-- Also run on insert
DROP TRIGGER IF EXISTS budget_threshold_check_insert ON client_budgets;
CREATE TRIGGER budget_threshold_check_insert
  BEFORE INSERT ON client_budgets
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_thresholds();

-- Function to manually check all budgets
CREATE OR REPLACE FUNCTION check_all_budget_thresholds()
RETURNS void AS $$
BEGIN
  UPDATE client_budgets
  SET updated_at = NOW()
  WHERE start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND actual_spending > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_all_budget_thresholds() IS 'Manually trigger budget threshold checks for all active budgets';