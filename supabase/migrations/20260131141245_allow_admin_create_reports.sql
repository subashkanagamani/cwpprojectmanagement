/*
  # Allow Admins to Create Reports

  1. Changes
    - Add new RLS policy to allow admins to insert weekly reports on behalf of employees
    - Add new RLS policy to allow admins to update any report
  
  2. Security
    - Admins can create reports for any employee
    - Admins can update any report
    - Maintains existing employee policies (employees can still only create/update their own reports)
*/

-- Allow admins to insert reports for any employee
CREATE POLICY "Admins can create reports for employees"
  ON weekly_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update any report
CREATE POLICY "Admins can update all reports"
  ON weekly_reports
  FOR UPDATE
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
