/*
  # Budget Automation System

  1. New Features
    - Automatic budget spending calculation from time entries
    - Trigger to update budgets when time entries change
    - Function to calculate utilization percentages

  2. Changes
    - Create function to calculate actual spending from time entries
    - Create trigger on time_entries table
    - Add helper functions for budget calculations

  3. Benefits
    - Real-time budget tracking
    - Automatic spending updates
    - Reduced manual data entry
*/

-- Function to calculate actual spending for a budget period
CREATE OR REPLACE FUNCTION calculate_budget_spending(
  p_client_id uuid,
  p_service_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_spending numeric;
BEGIN
  SELECT COALESCE(SUM(hours * hourly_rate), 0)
  INTO total_spending
  FROM time_entries
  WHERE client_id = p_client_id
    AND service_id = p_service_id
    AND date >= p_start_date
    AND date <= p_end_date
    AND deleted_at IS NULL;

  RETURN total_spending;
END;
$$;

-- Function to update budget spending when time entries change
CREATE OR REPLACE FUNCTION update_budget_from_time_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id uuid;
  v_service_id uuid;
BEGIN
  -- Get the client_id and service_id from NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
    v_service_id := OLD.service_id;
  ELSE
    v_client_id := NEW.client_id;
    v_service_id := NEW.service_id;
  END IF;

  -- Update all active budgets for this client and service
  UPDATE client_budgets
  SET 
    actual_spending = calculate_budget_spending(
      v_client_id,
      v_service_id,
      start_date,
      end_date
    ),
    updated_at = now()
  WHERE client_id = v_client_id
    AND service_id = v_service_id
    AND end_date >= CURRENT_DATE
    AND deleted_at IS NULL;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on time_entries
DROP TRIGGER IF EXISTS trigger_update_budget_spending ON time_entries;
CREATE TRIGGER trigger_update_budget_spending
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_from_time_entries();

-- Function to get budget utilization percentage
CREATE OR REPLACE FUNCTION get_budget_utilization(
  p_client_id uuid,
  p_service_id uuid
)
RETURNS TABLE (
  budget_id uuid,
  monthly_budget numeric,
  actual_spending numeric,
  utilization_percent numeric,
  status text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.id as budget_id,
    cb.monthly_budget,
    cb.actual_spending,
    CASE 
      WHEN cb.monthly_budget > 0 THEN 
        ROUND((cb.actual_spending / cb.monthly_budget * 100), 2)
      ELSE 0
    END as utilization_percent,
    CASE 
      WHEN cb.monthly_budget > 0 AND (cb.actual_spending / cb.monthly_budget * 100) >= 100 THEN 'exceeded'
      WHEN cb.monthly_budget > 0 AND (cb.actual_spending / cb.monthly_budget * 100) >= 90 THEN 'critical'
      WHEN cb.monthly_budget > 0 AND (cb.actual_spending / cb.monthly_budget * 100) >= 80 THEN 'warning'
      ELSE 'healthy'
    END as status
  FROM client_budgets cb
  WHERE cb.client_id = p_client_id
    AND (p_service_id IS NULL OR cb.service_id = p_service_id)
    AND cb.deleted_at IS NULL
    AND cb.end_date >= CURRENT_DATE;
END;
$$;