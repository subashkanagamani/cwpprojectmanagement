/*
  # Account Manager Role & Client Credentials System

  1. Role Updates
    - Add 'account_manager' role type to profiles
    - Update role constraints

  2. New Tables
    - `client_credentials` - Stores encrypted client access credentials
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `tool_name` (text) - Name of tool/service
      - `username` (text) - Username for the tool
      - `encrypted_password` (text) - Encrypted password
      - `notes` (text) - Additional notes
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on client_credentials table
    - Auto-grant access based on client assignments
    - Admins have full access
    - Account managers can view credentials for their assigned clients
    - Employees can only view credentials for clients they're assigned to

  4. Functions
    - `get_account_manager_daily_tasks()` - Gets daily task summary for account managers
    - `can_access_client_credentials()` - Checks if user can access specific client credentials
*/

-- Update profiles table to allow account_manager role
DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  -- Add new constraint with account_manager included
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'employee', 'account_manager'));
END $$;

-- Create client_credentials table
CREATE TABLE IF NOT EXISTS client_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  username text NOT NULL,
  encrypted_password text NOT NULL,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_credentials ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_credentials_client_id ON client_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credentials_created_by ON client_credentials(created_by);

-- Function to check if user can access client credentials
CREATE OR REPLACE FUNCTION can_access_client_credentials(p_client_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_role text;
  v_has_access boolean;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  
  -- Admins have full access
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the client
  SELECT EXISTS(
    SELECT 1 FROM client_assignments
    WHERE client_id = p_client_id AND employee_id = p_user_id
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for client_credentials

-- Admins can do everything
CREATE POLICY "Admins have full access to credentials"
  ON client_credentials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Employees and account managers can view credentials for their assigned clients
CREATE POLICY "Users can view credentials for assigned clients"
  ON client_credentials FOR SELECT
  TO authenticated
  USING (
    can_access_client_credentials(client_id, auth.uid())
  );

-- Function to get account manager daily tasks
CREATE OR REPLACE FUNCTION get_account_manager_daily_tasks()
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  employee_email text,
  tasks_assigned_today bigint,
  tasks_completed_today bigint,
  pending_tasks_count bigint,
  active_clients_count bigint,
  avg_task_priority numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH manager_clients AS (
    -- Get all clients assigned to this account manager
    SELECT DISTINCT ca.client_id
    FROM client_assignments ca
    WHERE ca.employee_id = auth.uid()
  ),
  team_members AS (
    -- Get all employees assigned to these clients
    SELECT DISTINCT ca.employee_id
    FROM client_assignments ca
    WHERE ca.client_id IN (SELECT client_id FROM manager_clients)
    AND ca.employee_id != auth.uid()
  )
  SELECT 
    p.id as employee_id,
    p.full_name as employee_name,
    p.email as employee_email,
    COUNT(CASE 
      WHEN t.status IN ('pending', 'in_progress')
      AND t.created_at::date = CURRENT_DATE
      THEN 1 
    END)::bigint as tasks_assigned_today,
    COUNT(CASE 
      WHEN t.status = 'completed'
      AND t.completed_at::date = CURRENT_DATE
      THEN 1 
    END)::bigint as tasks_completed_today,
    COUNT(CASE 
      WHEN t.status IN ('pending', 'in_progress')
      THEN 1 
    END)::bigint as pending_tasks_count,
    COUNT(DISTINCT ca.client_id)::bigint as active_clients_count,
    AVG(CASE 
      WHEN t.priority = 'low' THEN 1
      WHEN t.priority = 'medium' THEN 2
      WHEN t.priority = 'high' THEN 3
      WHEN t.priority = 'critical' THEN 4
      ELSE 2
    END) as avg_task_priority
  FROM profiles p
  INNER JOIN team_members tm ON p.id = tm.employee_id
  LEFT JOIN tasks t ON p.id = t.assigned_to
  LEFT JOIN client_assignments ca ON p.id = ca.employee_id
  WHERE p.role IN ('employee', 'account_manager')
  GROUP BY p.id, p.full_name, p.email
  ORDER BY pending_tasks_count DESC, tasks_assigned_today DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_access_client_credentials(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_manager_daily_tasks() TO authenticated;

-- Function to get available employees for task assignment (for account managers)
CREATE OR REPLACE FUNCTION get_available_team_members_for_assignment()
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  employee_email text,
  pending_tasks_count bigint,
  workload_score integer,
  availability_status text
) AS $$
BEGIN
  RETURN QUERY
  WITH manager_clients AS (
    SELECT DISTINCT ca.client_id
    FROM client_assignments ca
    WHERE ca.employee_id = auth.uid()
  ),
  team_members AS (
    SELECT DISTINCT ca.employee_id
    FROM client_assignments ca
    WHERE ca.client_id IN (SELECT client_id FROM manager_clients)
  )
  SELECT 
    p.id as employee_id,
    p.full_name as employee_name,
    p.email as employee_email,
    COUNT(CASE 
      WHEN t.status IN ('pending', 'in_progress')
      THEN 1 
    END)::bigint as pending_tasks_count,
    (
      LEAST(COUNT(CASE WHEN t.status IN ('pending', 'in_progress') THEN 1 END)::integer * 2, 40) +
      LEAST(COUNT(CASE WHEN t.status IN ('pending', 'in_progress') AND t.due_date < CURRENT_DATE THEN 1 END)::integer * 8, 40)
    ) as workload_score,
    CASE 
      WHEN COUNT(CASE WHEN t.status IN ('pending', 'in_progress') THEN 1 END) < 6 THEN 'available'
      WHEN COUNT(CASE WHEN t.status IN ('pending', 'in_progress') THEN 1 END) <= 15 THEN 'moderate'
      ELSE 'busy'
    END as availability_status
  FROM profiles p
  INNER JOIN team_members tm ON p.id = tm.employee_id
  LEFT JOIN tasks t ON p.id = t.assigned_to
  WHERE p.role IN ('employee', 'account_manager')
  GROUP BY p.id, p.full_name, p.email
  ORDER BY pending_tasks_count ASC, workload_score ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_available_team_members_for_assignment() TO authenticated;

-- Update timestamp trigger for client_credentials
CREATE OR REPLACE FUNCTION update_client_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_client_credentials_updated_at ON client_credentials;
CREATE TRIGGER update_client_credentials_updated_at
  BEFORE UPDATE ON client_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_client_credentials_updated_at();
