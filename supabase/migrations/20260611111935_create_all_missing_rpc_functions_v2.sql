-- get_account_manager_daily_tasks
CREATE OR REPLACE FUNCTION get_account_manager_daily_tasks(manager_profile_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  due_date date,
  assigned_to uuid,
  client_id uuid,
  employee_name text,
  client_name text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.assigned_to,
    t.client_id,
    p.full_name AS employee_name,
    c.name AS client_name,
    t.created_at
  FROM tasks t
  JOIN profiles p ON p.id = t.assigned_to
  LEFT JOIN clients c ON c.id = t.client_id
  WHERE t.assigned_to IN (
    SELECT id FROM profiles WHERE manager_id = manager_profile_id
    UNION
    SELECT mh.employee_id FROM manager_hierarchy mh WHERE mh.manager_id = manager_profile_id
  )
  AND t.deleted_at IS NULL
  ORDER BY t.due_date ASC, t.created_at DESC;
$$;

-- get_available_team_members_for_assignment
CREATE OR REPLACE FUNCTION get_available_team_members_for_assignment(p_client_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role
  FROM profiles p
  WHERE p.role = 'employee'
    AND p.deleted_at IS NULL
    AND p.id NOT IN (
      SELECT ca.employee_id
      FROM client_assignments ca
      WHERE ca.client_id = p_client_id
        AND ca.deleted_at IS NULL
    )
  ORDER BY p.full_name;
$$;

-- get_managed_clients
CREATE OR REPLACE FUNCTION get_managed_clients(manager_profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  industry text,
  status text,
  health_score numeric,
  assigned_employee_id uuid,
  assigned_employee_name text,
  service_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (c.id)
    c.id,
    c.name,
    c.industry,
    c.status,
    c.health_score,
    p.id AS assigned_employee_id,
    p.full_name AS assigned_employee_name,
    s.name AS service_name
  FROM clients c
  JOIN client_assignments ca ON ca.client_id = c.id
  JOIN profiles p ON p.id = ca.employee_id
  LEFT JOIN services s ON s.id = ca.service_id
  WHERE ca.employee_id IN (
    SELECT id FROM profiles WHERE manager_id = manager_profile_id
    UNION
    SELECT mh.employee_id FROM manager_hierarchy mh WHERE mh.manager_id = manager_profile_id
  )
  AND c.deleted_at IS NULL
  ORDER BY c.id, c.name;
$$;

-- get_team_daily_progress
CREATE OR REPLACE FUNCTION get_team_daily_progress(manager_profile_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  total_tasks bigint,
  completed_tasks bigint,
  hours_logged bigint,
  daily_status text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS employee_id,
    p.full_name AS employee_name,
    COUNT(dtl.id) AS total_tasks,
    COUNT(dtl.id) FILTER (WHERE dtl.status = 'submitted') AS completed_tasks,
    COUNT(dtl.id) AS hours_logged,
    COALESCE(MAX(dtl.status), 'not_started') AS daily_status
  FROM profiles p
  LEFT JOIN daily_task_logs dtl ON dtl.employee_id = p.id AND dtl.log_date = p_date
  WHERE p.id IN (
    SELECT id FROM profiles WHERE manager_id = manager_profile_id
    UNION
    SELECT mh.employee_id FROM manager_hierarchy mh WHERE mh.manager_id = manager_profile_id
  )
  AND p.deleted_at IS NULL
  GROUP BY p.id, p.full_name
  ORDER BY p.full_name;
$$;

-- update_all_client_health_scores
CREATE OR REPLACE FUNCTION update_all_client_health_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE clients
  SET health_score = LEAST(100, GREATEST(0,
    50
    + CASE WHEN EXISTS (
        SELECT 1 FROM weekly_reports wr
        WHERE wr.client_id = clients.id
          AND wr.week_start_date >= CURRENT_DATE - INTERVAL '30 days'
          AND wr.status = 'approved'
      ) THEN 25 ELSE 0 END
    + CASE WHEN EXISTS (
        SELECT 1 FROM client_assignments ca
        WHERE ca.client_id = clients.id
          AND ca.is_account_manager = true
          AND ca.deleted_at IS NULL
      ) THEN 25 ELSE 0 END
  ))
  WHERE status = 'active'
    AND deleted_at IS NULL;
END;
$$;
