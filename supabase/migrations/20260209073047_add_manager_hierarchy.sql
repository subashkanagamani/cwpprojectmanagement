/*
  # Add Manager Hierarchy to Profiles
  
  1. Changes
    - Add manager_id field to profiles table to establish manager-employee relationships
    - Add foreign key constraint
    - Create index for efficient queries
    - Add RLS policies for manager access to team data
  
  2. Security
    - Managers can view their direct reports
    - Employees can see their manager
*/

-- Add manager_id column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for efficient manager lookups
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- Create helper function to check if user is manager of employee
CREATE OR REPLACE FUNCTION public.is_manager_of(employee_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = employee_id 
    AND manager_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager_of(uuid) TO authenticated;

-- Create function to get all team members under a manager (including nested reports)
CREATE OR REPLACE FUNCTION public.get_team_members(manager_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  manager_id uuid,
  level integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH RECURSIVE team_hierarchy AS (
    -- Base case: direct reports
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.status,
      p.manager_id,
      1 as level
    FROM public.profiles p
    WHERE p.manager_id = COALESCE(manager_user_id, auth.uid())
    AND p.deleted_at IS NULL
    
    UNION ALL
    
    -- Recursive case: reports of reports
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.status,
      p.manager_id,
      th.level + 1
    FROM public.profiles p
    INNER JOIN team_hierarchy th ON p.manager_id = th.id
    WHERE p.deleted_at IS NULL
    AND th.level < 5  -- Prevent infinite recursion, max 5 levels
  )
  SELECT * FROM team_hierarchy
  ORDER BY level, full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members(uuid) TO authenticated;

-- Add policy for managers to view their team members' data
CREATE POLICY "Managers can view team members"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid()) OR 
    public.is_admin() OR
    public.is_manager_of(id)
  );

-- Allow managers to see tasks assigned to their team
DROP POLICY IF EXISTS "Managers can view team tasks" ON public.tasks;
CREATE POLICY "Managers can view team tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = (select auth.uid()) OR
    public.is_admin() OR
    public.is_manager_of(assigned_to)
  );

-- Allow managers to see reports from their team
DROP POLICY IF EXISTS "Managers can view team reports" ON public.weekly_reports;
CREATE POLICY "Managers can view team reports"
  ON public.weekly_reports FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid()) OR
    public.is_admin() OR
    public.is_manager_of(employee_id)
  );

-- Allow managers to see daily task logs from their team
DROP POLICY IF EXISTS "Managers can view team daily logs" ON public.daily_task_logs;
CREATE POLICY "Managers can view team daily logs"
  ON public.daily_task_logs FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid()) OR
    public.is_admin() OR
    public.is_manager_of(employee_id)
  );
