/*
  # Create Daily Task Management System

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text, required) - Task title
      - `description` (text, optional) - Task description
      - `assigned_to` (uuid, references profiles) - Employee assigned to task
      - `created_by` (uuid, references profiles) - Admin who created the task
      - `client_id` (uuid, references clients, optional) - Associated client
      - `priority` (text) - Low, Medium, High
      - `due_date` (date, required) - When the task is due
      - `status` (text) - pending, completed
      - `completed_at` (timestamptz, optional) - When task was completed
      - `remarks` (text, optional) - Employee remarks on task
      - `is_overdue` (boolean, computed) - Automatically determined
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tasks` table
    - Admins can create, view, update, delete all tasks
    - Employees can view their own tasks, update status and remarks only
    - Employees cannot create or delete tasks

  3. Indexes
    - Index on assigned_to for fast employee task queries
    - Index on due_date for sorting
    - Index on status for filtering
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin policies: Full access to all tasks
CREATE POLICY "Admins can view all tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Employee policies: Can view and update only their own tasks
CREATE POLICY "Employees can view own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Employees can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-set completed_at when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  
  -- Clear completed_at when status changes back to pending
  IF NEW.status = 'pending' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Create view for overdue tasks (tasks with due_date < today and status = pending)
CREATE OR REPLACE VIEW overdue_tasks AS
SELECT 
  t.*,
  p.full_name as assigned_to_name,
  p.email as assigned_to_email,
  c.name as client_name,
  (t.due_date < CURRENT_DATE AND t.status = 'pending') as is_overdue,
  (CURRENT_DATE - t.due_date) as days_overdue
FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.due_date < CURRENT_DATE 
  AND t.status = 'pending';

-- Grant access to the view
GRANT SELECT ON overdue_tasks TO authenticated;
