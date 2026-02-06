/*
  # Core Schema for Agency Client Management System

  ## Overview
  This migration sets up the complete database schema for an internal marketing agency
  client management and weekly reporting tool.

  ## New Tables
  
  ### 1. `profiles`
  Extended user profile information linked to auth.users
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - 'admin' or 'employee'
  - `status` (text) - 'active' or 'inactive'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `clients`
  Client/customer information
  - `id` (uuid, primary key)
  - `name` (text)
  - `industry` (text)
  - `status` (text) - 'active', 'paused', 'completed'
  - `start_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `services`
  Available marketing services (reference data)
  - `id` (uuid, primary key)
  - `name` (text) - 'Email Outreach', 'LinkedIn Outreach', etc.
  - `slug` (text) - 'email_outreach', 'linkedin_outreach', etc.
  - `description` (text)
  - `is_active` (boolean)

  ### 4. `client_services`
  Services enabled for each client
  - `id` (uuid, primary key)
  - `client_id` (uuid, FK to clients)
  - `service_id` (uuid, FK to services)
  - `created_at` (timestamptz)

  ### 5. `client_assignments`
  Employee assignments to clients with specific roles
  - `id` (uuid, primary key)
  - `client_id` (uuid, FK to clients)
  - `employee_id` (uuid, FK to profiles)
  - `service_id` (uuid, FK to services)
  - `created_at` (timestamptz)

  ### 6. `weekly_reports`
  Main weekly report entries
  - `id` (uuid, primary key)
  - `client_id` (uuid, FK to clients)
  - `employee_id` (uuid, FK to profiles)
  - `service_id` (uuid, FK to services)
  - `week_start_date` (date)
  - `work_summary` (text)
  - `status` (text) - 'on_track', 'needs_attention', 'delayed'
  - `key_wins` (text)
  - `challenges` (text)
  - `next_week_plan` (text)
  - `submitted_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `service_metrics`
  Service-specific metrics for each weekly report
  - `id` (uuid, primary key)
  - `weekly_report_id` (uuid, FK to weekly_reports)
  - `metric_data` (jsonb) - Flexible JSON storage for different metric types
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Admins can access everything
  - Employees can only access their assigned clients and their own data

  ## Notes
  - Uses JSONB for flexible metric storage (different services have different metrics)
  - Supports multiple employees per client with different roles
  - Week-based reporting system
*/

-- Create profiles table (extended user info)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  start_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create client_services junction table
CREATE TABLE IF NOT EXISTS client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, service_id)
);

-- Create client_assignments table
CREATE TABLE IF NOT EXISTS client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, employee_id, service_id)
);

-- Create weekly_reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  work_summary text,
  status text NOT NULL CHECK (status IN ('on_track', 'needs_attention', 'delayed')),
  key_wins text,
  challenges text,
  next_week_plan text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, employee_id, service_id, week_start_date)
);

-- Create service_metrics table
CREATE TABLE IF NOT EXISTS service_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_report_id uuid NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  metric_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Insert default services
INSERT INTO services (name, slug, description) VALUES
  ('Email Outreach', 'email_outreach', 'Cold email campaigns and outreach'),
  ('LinkedIn Outreach', 'linkedin_outreach', 'LinkedIn connection and messaging campaigns'),
  ('Meta Ads', 'meta_ads', 'Facebook and Instagram advertising'),
  ('Google Ads', 'google_ads', 'Google search and display advertising'),
  ('SEO', 'seo', 'Search engine optimization'),
  ('Social Media Management', 'social_media', 'Social media content and community management')
ON CONFLICT (slug) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
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

-- RLS Policies for clients
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view assigned clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_assignments.client_id = clients.id
      AND client_assignments.employee_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
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

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for services (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for client_services
CREATE POLICY "Admins can manage client services"
  ON client_services FOR ALL
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

CREATE POLICY "Employees can view assigned client services"
  ON client_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_assignments.client_id = client_services.client_id
      AND client_assignments.employee_id = auth.uid()
    )
  );

-- RLS Policies for client_assignments
CREATE POLICY "Admins can manage assignments"
  ON client_assignments FOR ALL
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

CREATE POLICY "Employees can view own assignments"
  ON client_assignments FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- RLS Policies for weekly_reports
CREATE POLICY "Admins can view all reports"
  ON weekly_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own reports"
  ON weekly_reports FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own reports"
  ON weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own reports"
  ON weekly_reports FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- RLS Policies for service_metrics
CREATE POLICY "Admins can view all metrics"
  ON service_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own metrics"
  ON service_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = service_metrics.weekly_report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert own metrics"
  ON service_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = service_metrics.weekly_report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own metrics"
  ON service_metrics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = service_metrics.weekly_report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = service_metrics.weekly_report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_employee ON client_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_client ON weekly_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_employee ON weekly_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week_start_date);
CREATE INDEX IF NOT EXISTS idx_service_metrics_report ON service_metrics(weekly_report_id);