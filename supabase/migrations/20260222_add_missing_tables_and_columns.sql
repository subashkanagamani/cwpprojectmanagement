/*
  # Add Missing Tables and Columns for ClientFlow
  
  1. New columns on existing tables:
    - client_assignments: is_active, is_account_manager
    - profiles: manager_id
    - client_portal_users: auth_user_id (rename from user_id)
  
  2. New tables:
    - deals
    - feedback
    - time_off_requests
    - email_logs
*/

-- Add missing columns to client_assignments
ALTER TABLE client_assignments ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE client_assignments ADD COLUMN IF NOT EXISTS is_account_manager boolean DEFAULT false;

-- Add missing column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add auth_user_id column to client_portal_users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_portal_users' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_portal_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE client_portal_users RENAME COLUMN user_id TO auth_user_id;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_portal_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE client_portal_users ADD COLUMN auth_user_id uuid;
  END IF;
END $$;

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  deal_name text NOT NULL,
  deal_value numeric(12, 2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'lead',
  probability integer DEFAULT 0,
  expected_close_date date,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_to_user ON feedback(to_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_from_user ON feedback(from_user_id);

-- Create time_off_requests table
CREATE TABLE IF NOT EXISTS time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'vacation',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee ON time_off_requests(employee_id);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text,
  template_used text,
  status text DEFAULT 'sent',
  sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
