/*
  # Add Account Manager Tracking

  1. Changes
    - Add is_account_manager flag to client_assignments to identify account managers for specific clients
    - Create function to get all employees working on clients where user is account manager
    - Create function to get team progress for account managers
    - Add RLS policies for account managers to view team data on their clients
    
  2. Security
    - Account managers can view all employees assigned to their managed clients
    - Account managers can view daily logs for their managed clients
*/

-- Add is_account_manager flag to client_assignments
ALTER TABLE public.client_assignments 
ADD COLUMN IF NOT EXISTS is_account_manager boolean DEFAULT false;

-- Create index for efficient account manager queries
CREATE INDEX IF NOT EXISTS idx_client_assignments_account_manager 
ON public.client_assignments(employee_id, is_account_manager) 
WHERE is_account_manager = true AND deleted_at IS NULL;

-- Function to check if user is account manager for a specific client
CREATE OR REPLACE FUNCTION public.is_account_manager_for_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.client_assignments 
    WHERE client_id = p_client_id 
    AND employee_id = auth.uid()
    AND is_account_manager = true
    AND deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_account_manager_for_client(uuid) TO authenticated;

-- Function to get all clients where user is account manager
CREATE OR REPLACE FUNCTION public.get_managed_clients()
RETURNS TABLE (
  client_id uuid,
  client_name text,
  employee_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    c.id as client_id,
    c.name as client_name,
    COUNT(DISTINCT ca.employee_id) as employee_count
  FROM public.clients c
  INNER JOIN public.client_assignments ca_manager 
    ON ca_manager.client_id = c.id 
    AND ca_manager.employee_id = auth.uid()
    AND ca_manager.is_account_manager = true
    AND ca_manager.deleted_at IS NULL
  LEFT JOIN public.client_assignments ca 
    ON ca.client_id = c.id 
    AND ca.deleted_at IS NULL
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.name
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_managed_clients() TO authenticated;

-- Function to get all team members working on managed clients
CREATE OR REPLACE FUNCTION public.get_team_on_managed_clients()
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  employee_email text,
  employee_role text,
  client_id uuid,
  client_name text,
  service_id uuid,
  service_name text,
  assignment_id uuid,
  is_account_manager boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT
    p.id as employee_id,
    p.full_name as employee_name,
    p.email as employee_email,
    p.role as employee_role,
    c.id as client_id,
    c.name as client_name,
    s.id as service_id,
    s.name as service_name,
    ca.id as assignment_id,
    ca.is_account_manager
  FROM public.client_assignments ca_manager
  INNER JOIN public.clients c ON c.id = ca_manager.client_id
  INNER JOIN public.client_assignments ca ON ca.client_id = c.id AND ca.deleted_at IS NULL
  INNER JOIN public.profiles p ON p.id = ca.employee_id AND p.deleted_at IS NULL
  INNER JOIN public.services s ON s.id = ca.service_id
  WHERE ca_manager.employee_id = auth.uid()
    AND ca_manager.is_account_manager = true
    AND ca_manager.deleted_at IS NULL
    AND c.deleted_at IS NULL
  ORDER BY c.name, p.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_on_managed_clients() TO authenticated;

-- Function to get daily progress for team on managed clients
CREATE OR REPLACE FUNCTION public.get_team_daily_progress(p_log_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  client_id uuid,
  client_name text,
  service_id uuid,
  service_name text,
  assignment_id uuid,
  log_id uuid,
  notes text,
  work_status text,
  submission_status text,
  submitted_at timestamptz,
  metrics jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    p.id as employee_id,
    p.full_name as employee_name,
    c.id as client_id,
    c.name as client_name,
    s.id as service_id,
    s.name as service_name,
    ca.id as assignment_id,
    dtl.id as log_id,
    dtl.notes,
    dtl.work_status,
    dtl.status as submission_status,
    dtl.submitted_at,
    dtl.metrics
  FROM public.client_assignments ca_manager
  INNER JOIN public.clients c ON c.id = ca_manager.client_id
  INNER JOIN public.client_assignments ca ON ca.client_id = c.id AND ca.deleted_at IS NULL
  INNER JOIN public.profiles p ON p.id = ca.employee_id AND p.deleted_at IS NULL
  INNER JOIN public.services s ON s.id = ca.service_id
  LEFT JOIN public.daily_task_logs dtl ON dtl.assignment_id = ca.id AND dtl.log_date = p_log_date
  WHERE ca_manager.employee_id = auth.uid()
    AND ca_manager.is_account_manager = true
    AND ca_manager.deleted_at IS NULL
    AND c.deleted_at IS NULL
  ORDER BY c.name, p.full_name, s.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_daily_progress(date) TO authenticated;

-- Update RLS policies to allow account managers to view team data on their clients
DROP POLICY IF EXISTS "Account managers can view team assignments" ON public.client_assignments;
CREATE POLICY "Account managers can view team assignments"
  ON public.client_assignments FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_admin() OR
    public.is_account_manager_for_client(client_id)
  );

DROP POLICY IF EXISTS "Account managers can view team daily logs" ON public.daily_task_logs;
CREATE POLICY "Account managers can view team daily logs"
  ON public.daily_task_logs FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_admin() OR
    public.is_manager_of(employee_id) OR
    public.is_account_manager_for_client(client_id)
  );
