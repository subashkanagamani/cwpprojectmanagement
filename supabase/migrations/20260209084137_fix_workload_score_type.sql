/*
  # Fix workload_score return type

  1. Changes
    - Recreate get_available_team_members_for_assignment with correct numeric type
    
  2. Result
    - workload_score properly typed as numeric
*/

-- Drop and recreate with proper type
DROP FUNCTION IF EXISTS get_available_team_members_for_assignment() CASCADE;

CREATE FUNCTION get_available_team_members_for_assignment()
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  employee_email text,
  pending_tasks_count bigint,
  workload_score numeric,
  availability_status text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if caller is admin or manager
  IF NOT (public.is_admin() OR public.is_manager()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id as employee_id,
    p.full_name as employee_name,
    p.email as employee_email,
    COUNT(DISTINCT t.id) as pending_tasks_count,
    (COUNT(DISTINCT t.id) * 10 + COUNT(DISTINCT ca.client_id) * 5)::numeric as workload_score,
    CASE
      WHEN COUNT(DISTINCT t.id) < 6 THEN 'available'::text
      WHEN COUNT(DISTINCT t.id) BETWEEN 6 AND 15 THEN 'moderate'::text
      ELSE 'busy'::text
    END as availability_status
  FROM profiles p
  LEFT JOIN tasks t ON t.assigned_to = p.id 
    AND t.status IN ('pending', 'in_progress')
    AND t.deleted_at IS NULL
  LEFT JOIN client_assignments ca ON ca.employee_id = p.id 
    AND ca.deleted_at IS NULL
  WHERE p.deleted_at IS NULL
    AND p.status = 'active'
    AND (
      p.role = 'employee' 
      OR p.role = 'account_manager'
    )
    AND (
      -- If user is admin, show all employees
      public.is_admin()
      -- If user is manager, show their team
      OR (public.is_manager() AND p.manager_id = auth.uid())
    )
  GROUP BY p.id, p.full_name, p.email
  ORDER BY COUNT(DISTINCT t.id) ASC, p.full_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_team_members_for_assignment() TO authenticated;
