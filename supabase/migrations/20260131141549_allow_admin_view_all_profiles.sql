/*
  # Allow Admins to View and Manage All Profiles

  1. Changes
    - Add RLS policy to allow admins to view all profiles
    - Add RLS policy to allow admins to update any profile
  
  2. Security
    - Admins can view all user profiles (needed for employee dropdowns and management)
    - Admins can update any profile (needed for employee management)
    - Regular users can still only view and update their own profile
*/

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles
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
