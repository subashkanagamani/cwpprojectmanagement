/*
  # Create Daily Task Logs Table

  1. New Tables
    - `daily_task_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `assignment_id` (uuid, foreign key) - Links to client_assignments table
      - `employee_id` (uuid, foreign key) - The employee who created the log
      - `client_id` (uuid, foreign key) - The client this log is for
      - `service_id` (uuid, foreign key) - The service this log tracks
      - `log_date` (date) - Date of the log entry
      - `metrics` (jsonb) - Service-specific metrics (LinkedIn outreach, email outreach, ads, SEO, social media)
      - `notes` (text, nullable) - Optional notes from the employee
      - `status` (text) - Either 'pending' or 'submitted'
      - `submitted_at` (timestamptz, nullable) - When the log was submitted
      - `created_at` (timestamptz) - When the log was created
      - `updated_at` (timestamptz) - When the log was last updated

  2. Security
    - Enable RLS on `daily_task_logs` table
    - Add policies for employees to:
      - View their own daily logs
      - Create their own daily logs
      - Update their own daily logs
      - Delete their own daily logs
    - Add policies for admins and account managers to view all logs
*/

-- Create the daily_task_logs table
CREATE TABLE IF NOT EXISTS daily_task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES client_assignments(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_employee_date 
  ON daily_task_logs(employee_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_assignment 
  ON daily_task_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_client 
  ON daily_task_logs(client_id);

-- Enable RLS
ALTER TABLE daily_task_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own daily logs
CREATE POLICY "Employees can view own daily logs"
  ON daily_task_logs FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
  );

-- Policy: Admins and account managers can view all daily logs
CREATE POLICY "Admins can view all daily logs"
  ON daily_task_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'account_manager')
    )
  );

-- Policy: Employees can create their own daily logs
CREATE POLICY "Employees can create own daily logs"
  ON daily_task_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
  );

-- Policy: Employees can update their own daily logs
CREATE POLICY "Employees can update own daily logs"
  ON daily_task_logs FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Policy: Employees can delete their own daily logs
CREATE POLICY "Employees can delete own daily logs"
  ON daily_task_logs FOR DELETE
  TO authenticated
  USING (employee_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_task_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_task_logs_updated_at
  BEFORE UPDATE ON daily_task_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_task_logs_updated_at();