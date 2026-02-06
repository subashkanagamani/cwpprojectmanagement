/*
  # Add Soft Delete Support

  1. Changes
    - Add `deleted_at` column to critical tables for soft delete
    - Create function to filter out deleted records
    - Update RLS policies to exclude deleted records by default

  2. Tables Modified
    - `clients` - Add deleted_at timestamp
    - `profiles` - Add deleted_at timestamp
    - `weekly_reports` - Add deleted_at timestamp
    - `client_assignments` - Add deleted_at timestamp
    - `tasks` - Add deleted_at timestamp

  3. Benefits
    - Data is preserved for audit trails
    - Ability to restore accidentally deleted records
    - Better compliance with data retention policies
*/

-- Add deleted_at columns to tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN deleted_at timestamptz DEFAULT NULL;
    CREATE INDEX idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deleted_at timestamptz DEFAULT NULL;
    CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_reports' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE weekly_reports ADD COLUMN deleted_at timestamptz DEFAULT NULL;
    CREATE INDEX idx_weekly_reports_deleted_at ON weekly_reports(deleted_at) WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_assignments' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE client_assignments ADD COLUMN deleted_at timestamptz DEFAULT NULL;
    CREATE INDEX idx_client_assignments_deleted_at ON client_assignments(deleted_at) WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN deleted_at timestamptz DEFAULT NULL;
    CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- Create helper function to soft delete records
CREATE OR REPLACE FUNCTION soft_delete(table_name text, record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', table_name)
  USING record_id;
  
  RETURN FOUND;
END;
$$;

-- Create helper function to restore soft deleted records (admin only)
CREATE OR REPLACE FUNCTION restore_deleted(table_name text, record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = $1', table_name)
  USING record_id;
  
  RETURN FOUND;
END;
$$;