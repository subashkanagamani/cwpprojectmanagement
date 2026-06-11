-- Add manager_id to profiles (used by EmployeesPage)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id);

-- Ensure client_services table has required columns (it exists per our query)
-- Check and add any missing columns
ALTER TABLE client_services 
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();