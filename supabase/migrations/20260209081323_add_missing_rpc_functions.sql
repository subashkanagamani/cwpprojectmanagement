/*
  # Add Missing RPC Functions

  1. Functions Added
    - `get_account_manager_daily_tasks()` - Returns daily tasks for an account manager's team members
    - `get_available_team_members_for_assignment()` - Returns employees that can be assigned to clients
    - `update_all_client_health_scores()` - Recalculates and updates all client health scores

  2. Security
    - Functions use SECURITY DEFINER with proper role checks
    - Only admins and managers can call these functions
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_account_manager_daily_tasks(uuid);
DROP FUNCTION IF EXISTS get_available_team_members_for_assignment(uuid);
DROP FUNCTION IF EXISTS update_all_client_health_scores();

-- Function to get daily tasks for an account manager's team
CREATE FUNCTION get_account_manager_daily_tasks(manager_user_id uuid)
RETURNS TABLE (
  task_id uuid,
  employee_id uuid,
  employee_name text,
  client_id uuid,
  client_name text,
  service_id uuid,
  service_name text,
  task_date date,
  status text,
  hours_logged numeric,
  notes text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if caller is admin or the manager themselves
  IF NOT (public.is_admin() OR auth.uid() = manager_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    dtl.id as task_id,
    dtl.employee_id,
    p.full_name as employee_name,
    dtl.client_id,
    c.name as client_name,
    dtl.service_id,
    s.name as service_name,
    dtl.task_date,
    dtl.status,
    dtl.hours_logged,
    dtl.notes
  FROM daily_task_logs dtl
  INNER JOIN profiles p ON dtl.employee_id = p.id
  LEFT JOIN clients c ON dtl.client_id = c.id
  LEFT JOIN services s ON dtl.service_id = s.id
  WHERE p.manager_id = manager_user_id
    AND dtl.task_date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY dtl.task_date DESC, p.full_name;
END;
$$;

-- Function to get available team members for assignment
CREATE FUNCTION get_available_team_members_for_assignment(client_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  email text,
  role text,
  manager_id uuid,
  current_client_count bigint,
  is_already_assigned boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins and managers can call this
  IF NOT (public.is_admin() OR public.is_manager()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id as employee_id,
    p.full_name as employee_name,
    p.email,
    p.role,
    p.manager_id,
    COUNT(DISTINCT ca.client_id) as current_client_count,
    CASE
      WHEN client_id_param IS NOT NULL THEN
        EXISTS(
          SELECT 1 FROM client_assignments ca2
          WHERE ca2.employee_id = p.id
          AND ca2.client_id = client_id_param
          AND ca2.deleted_at IS NULL
        )
      ELSE false
    END as is_already_assigned
  FROM profiles p
  LEFT JOIN client_assignments ca ON ca.employee_id = p.id AND ca.deleted_at IS NULL
  WHERE p.deleted_at IS NULL
    AND p.role = 'employee'
  GROUP BY p.id, p.full_name, p.email, p.role, p.manager_id
  ORDER BY current_client_count ASC, p.full_name;
END;
$$;

-- Function to update all client health scores
CREATE FUNCTION update_all_client_health_scores()
RETURNS TABLE (
  client_id uuid,
  old_score integer,
  new_score integer,
  updated boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  client_record RECORD;
  calculated_score integer;
BEGIN
  -- Only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin only';
  END IF;

  FOR client_record IN
    SELECT id, health_score, deleted_at
    FROM clients
    WHERE deleted_at IS NULL
  LOOP
    -- Calculate health score based on various factors
    calculated_score := (
      SELECT
        GREATEST(0, LEAST(100,
          -- Base score of 70
          70 +
          -- Recent reports (+10 if report in last 7 days)
          (CASE
            WHEN EXISTS(
              SELECT 1 FROM weekly_reports
              WHERE client_id = client_record.id
              AND submitted_at >= NOW() - INTERVAL '7 days'
            ) THEN 10 ELSE -10
          END) +
          -- Task completion (+10 if tasks completed in last 7 days)
          (CASE
            WHEN EXISTS(
              SELECT 1 FROM daily_task_logs
              WHERE client_id = client_record.id
              AND status = 'completed'
              AND task_date >= CURRENT_DATE - INTERVAL '7 days'
            ) THEN 10 ELSE -5
          END) +
          -- Budget status (+10 if under budget, -10 if over)
          (CASE
            WHEN EXISTS(
              SELECT 1 FROM client_budgets
              WHERE client_id = client_record.id
              AND actual_spending <= monthly_budget
              AND month_year >= DATE_TRUNC('month', CURRENT_DATE)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_account_manager_daily_tasks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_team_members_for_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_client_health_scores() TO authenticated;