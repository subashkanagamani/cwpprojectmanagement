/*
  # Add Foreign Key Constraints and Fix RLS Policies

  1. Foreign Key Additions
    - Add foreign key constraint to client_notes.employee_id -> profiles.id
    - Add foreign key constraint to time_entries.employee_id -> profiles.id

  2. Add Missing UPDATE Policies
    - Add UPDATE policies for services, goals, custom_metrics tables

  3. Add Manager Access Policies
    - Managers can view team member daily_task_logs
    - Managers can update team member tasks
*/

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'client_notes_employee_id_fkey'
  ) THEN
    ALTER TABLE client_notes
    ADD CONSTRAINT client_notes_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'time_entries_employee_id_fkey'
  ) THEN
    ALTER TABLE time_entries
    ADD CONSTRAINT time_entries_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add missing UPDATE policies for services table
DROP POLICY IF EXISTS "Admins can update services" ON services;
CREATE POLICY "Admins can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add missing UPDATE policies for goals table
DROP POLICY IF EXISTS "Admins can update goals" ON goals;
CREATE POLICY "Admins can update goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Add missing UPDATE policies for custom_metrics table
DROP POLICY IF EXISTS "Admins can update custom metrics" ON custom_metrics;
CREATE POLICY "Admins can update custom metrics"
  ON custom_metrics
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add manager access policies for daily_task_logs
DROP POLICY IF EXISTS "Managers can view team daily tasks" ON daily_task_logs;
CREATE POLICY "Managers can view team daily tasks"
  ON daily_task_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    employee_id = auth.uid() OR
    public.is_manager_of(employee_id)
  );

DROP POLICY IF EXISTS "Managers can update team daily tasks" ON daily_task_logs;
CREATE POLICY "Managers can update team daily tasks"
  ON daily_task_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR
    employee_id = auth.uid() OR
    public.is_manager_of(employee_id)
  )
  WITH CHECK (
    public.is_admin() OR
    employee_id = auth.uid() OR
    public.is_manager_of(employee_id)
  );

DROP POLICY IF EXISTS "Managers can delete team daily tasks" ON daily_task_logs;
CREATE POLICY "Managers can delete team daily tasks"
  ON daily_task_logs
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR
    public.is_manager_of(employee_id)
  );