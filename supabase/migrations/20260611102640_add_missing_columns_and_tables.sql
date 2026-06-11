-- Add is_account_manager to client_assignments (used by UI)
ALTER TABLE client_assignments ADD COLUMN IF NOT EXISTS is_account_manager boolean DEFAULT false;

-- Mark existing assignments as account manager where service is 'Account Manager'
UPDATE client_assignments ca
SET is_account_manager = true
FROM services s
WHERE ca.service_id = s.id AND s.slug = 'account-manager';

-- Add missing tables referenced by pages but not yet created
-- Deals pipeline
CREATE TABLE IF NOT EXISTS deals_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  title text NOT NULL,
  value numeric,
  stage text DEFAULT 'prospect',
  probability integer DEFAULT 0,
  expected_close_date date,
  owner_id uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id),
  to_user_id uuid REFERENCES profiles(id),
  message text NOT NULL,
  type text DEFAULT 'general',
  rating integer,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text DEFAULT 'vacation',
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table  
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id uuid REFERENCES clients(id),
  description text,
  status text DEFAULT 'active',
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Manager hierarchy  
CREATE TABLE IF NOT EXISTS manager_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id),
  employee_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, employee_id)
);