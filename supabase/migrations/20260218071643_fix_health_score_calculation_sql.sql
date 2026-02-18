/*
  # Fix Client Health Score Calculation

  1. Changes
    - Fix the `update_all_client_health_scores()` function
    - Replace incorrect reference to `month_year` column (which doesn't exist)
    - Use `start_date` and `end_date` columns instead to check current budgets
    - This fixes the SQL error in health score recalculation

  2. Details
    - The client_budgets table uses `start_date` and `end_date`, not `month_year`
    - Updated query to check if current date falls within budget period
*/

CREATE OR REPLACE FUNCTION update_all_client_health_scores()
RETURNS TABLE(client_id uuid, old_score integer, new_score integer, updated boolean) 
LANGUAGE plpgsql
AS $$
DECLARE
  client_record RECORD;
  calculated_score integer;
BEGIN
  FOR client_record IN SELECT * FROM clients LOOP
    calculated_score := (
      SELECT GREATEST(0, LEAST(100,
        50 + 
        (CASE 
          WHEN (SELECT COUNT(*) FROM weekly_reports wr 
                JOIN client_assignments ca ON wr.assignment_id = ca.id 
                WHERE ca.client_id = client_record.id 
                AND wr.submitted_at >= NOW() - INTERVAL '30 days') >= 4 
          THEN 10 ELSE -10 
        END) +
        (CASE 
          WHEN (SELECT COUNT(*) FROM tasks 
                WHERE client_id = client_record.id 
                AND status = 'completed' 
                AND completed_at >= NOW() - INTERVAL '30 days') >= 5 
          THEN 10 ELSE -5 
        END) +
        (CASE 
          WHEN (SELECT COUNT(*) FROM tasks 
                WHERE client_id = client_record.id 
                AND status IN ('pending', 'in_progress') 
                AND due_date < NOW()) > 0 
          THEN -15 ELSE 5 
        END) +
        (CASE 
          WHEN EXISTS(
            SELECT 1 FROM meetings 
            WHERE client_id = client_record.id 
            AND meeting_date >= NOW() - INTERVAL '14 days'
          ) THEN 10 ELSE -5 
        END) +
        (CASE
          WHEN EXISTS(
            SELECT 1 FROM client_budgets
            WHERE client_id = client_record.id
            AND actual_spending <= monthly_budget
            AND start_date <= CURRENT_DATE
            AND (end_date IS NULL OR end_date >= CURRENT_DATE)
          ) THEN 10 ELSE -10
        END)
      ))
    );

    -- Update the client's health score
    UPDATE clients
    SET
      health_score = calculated_score,
      updated_at = NOW()
    WHERE id = client_record.id;

    RETURN QUERY SELECT
      client_record.id,
      client_record.health_score as old_score,
      calculated_score as new_score,
      true as updated;
  END LOOP;
END;
$$;