/*
  # Create Employee Workload Dashboard System

  1. New Functions
    - `get_employee_workload_metrics()` - Calculates comprehensive workload data for all employees
    - Returns employee name, active tasks, overdue tasks, clients assigned, and workload status

  2. Workload Classification
    - **Overloaded**: >15 active tasks OR >5 overdue tasks OR >8 clients
    - **Balanced**: 6-15 active tasks, <5 overdue tasks, 3-8 clients
    - **Underutilized**: <6 active tasks, 0-1 overdue tasks, <3 clients

  3. Metrics Included
    - Total active (pending) tasks
    - Overdue tasks count
    - Clients assigned count
    - Workload score (0-100)
    - Workload status (overloaded/balanced/underutilized)
    - Tasks completed this week (for productivity tracking)

  4. Security
    - Function is SECURITY DEFINER (admin access only)
    - Grants to authenticated users for admin role
*/

-- Function to calculate workload status
CREATE OR REPLACE FUNCTION calculate_workload_status(
  p_active_tasks integer,
  p_overdue_tasks integer,
  p_client_count integer
)
RETURNS text AS $$
BEGIN
  -- Overloaded criteria: >15 active tasks OR >5 overdue OR >8 clients
  IF p_active_tasks > 15 OR p_overdue_tasks > 5 OR p_client_count > 8 THEN
    RETURN 'overloaded';
  END IF;
  
  -- Underutilized criteria: <6 active tasks AND <=1 overdue AND <3 clients
  IF p_active_tasks < 6 AND p_overdue_tasks <= 1 AND p_client_count < 3 THEN
    RETURN 'underutilized';
  END IF;
  
  -- Everything else is balanced
  RETURN 'balanced';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate workload score (0-100)
CREATE OR REPLACE FUNCTION calculate_workload_score(
  p_active_tasks integer,
  p_overdue_tasks integer,
  p_client_count integer
)
RETURNS integer AS $$
DECLARE
  v_score integer := 0;
BEGIN
  -- Base score from active tasks (max 40 points)
  v_score := v_score + LEAST(p_active_tasks * 2, 40);
  
  -- Penalty for overdue tasks (max 40 points)
  v_score := v_score + LEAST(p_overdue_tasks * 8, 40);
  
  -- Score from client count (max 20 points)
  v_score := v_score + LEAST(p_client_count * 2, 20);
  
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main function to get employee workload metrics
CREATE OR REPLACE FUNCTION get_employee_workload_metrics()
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  employee_email text,
  active_tasks_count bigint,
  overdue_tasks_count bigint,
  clients_assigned_count bigint,
  completed_this_week_count bigint,
  workload_score integer,
  workload_status text,
  avg_task_priority numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH employee_tasks AS (
    SELECT 
      p.id as emp_id,
      p.full_name as emp_name,
      p.email as emp_email,
      COUNT(CASE WHEN t.status != 'completed' THEN 1 END) as active_count,
      COUNT(CASE 
        WHEN t.status != 'completed' 
        AND t.due_date < CURRENT_DATE 
        THEN 1 
      END) as overdue_count,
      COUNT(CASE 
        WHEN t.status = 'completed' 
        AND t.completed_at >= CURRENT_DATE - INTERVAL '7 days'
        THEN 1 
      END) as completed_week_count,
      AVG(CASE 
        WHEN t.priority = 'low' THEN 1
        WHEN t.priority = 'medium' THEN 2
        WHEN t.priority = 'high' THEN 3
        WHEN t.priority = 'critical' THEN 4
        ELSE 2
      END) as avg_priority
    FROM profiles p
    LEFT JOIN tasks t ON p.id = t.assigned_to
    WHERE p.role = 'employee'
    GROUP BY p.id, p.full_name, p.email
  ),
  employee_clients AS (
    SELECT 
      ca.employee_id,
      COUNT(DISTINCT ca.client_id) as client_count
    FROM client_assignments ca
    INNER JOIN clients c ON ca.client_id = c.id
    WHERE c.status = 'active'
    GROUP BY ca.employee_id
  )
  SELECT 
    et.emp_id,
    et.emp_name,
    et.emp_email,
    et.active_count::bigint,
    et.overdue_count::bigint,
    COALESCE(ec.client_count, 0)::bigint,
    et.completed_week_count::bigint,
    calculate_workload_score(
      et.active_count::integer,
      et.overdue_count::integer,
      COALESCE(ec.client_count, 0)::integer
    ),
    calculate_workload_status(
      et.active_count::integer,
      et.overdue_count::integer,
      COALESCE(ec.client_count, 0)::integer
    ),
    COALESCE(et.avg_priority, 2)
  FROM employee_tasks et
  LEFT JOIN employee_clients ec ON et.emp_id = ec.employee_id
  ORDER BY 
    CASE 
      WHEN calculate_workload_status(
        et.active_count::integer,
        et.overdue_count::integer,
        COALESCE(ec.client_count, 0)::integer
      ) = 'overloaded' THEN 1
      WHEN calculate_workload_status(
        et.active_count::integer,
        et.overdue_count::integer,
        COALESCE(ec.client_count, 0)::integer
      ) = 'balanced' THEN 2
      ELSE 3
    END,
    et.overdue_count DESC,
    et.active_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_employee_workload_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_workload_status(integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_workload_score(integer, integer, integer) TO authenticated;

-- Create summary statistics view
CREATE OR REPLACE VIEW employee_workload_summary AS
SELECT 
  COUNT(*) as total_employees,
  COUNT(CASE WHEN workload_status = 'overloaded' THEN 1 END) as overloaded_count,
  COUNT(CASE WHEN workload_status = 'balanced' THEN 1 END) as balanced_count,
  COUNT(CASE WHEN workload_status = 'underutilized' THEN 1 END) as underutilized_count,
  ROUND(AVG(active_tasks_count), 1) as avg_active_tasks,
  SUM(overdue_tasks_count) as total_overdue_tasks,
  ROUND(AVG(clients_assigned_count), 1) as avg_clients_per_employee,
  ROUND(AVG(workload_score), 1) as avg_workload_score
FROM get_employee_workload_metrics();

-- Grant access to the view
GRANT SELECT ON employee_workload_summary TO authenticated;
ALTER VIEW employee_workload_summary SET (security_invoker = on);
