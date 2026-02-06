/*
  # Enhanced Features Migration

  ## Overview
  Adds comprehensive enhancements to the ClientFlow system including activity logs,
  approval workflows, file attachments, comments, budgets, and more.

  ## New Tables

  ### 1. `activity_logs`
  Tracks all user actions for audit trail
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles)
  - `action` (text) - Type of action (create, update, delete, etc.)
  - `entity_type` (text) - What was affected (client, employee, report, etc.)
  - `entity_id` (uuid) - ID of affected entity
  - `details` (jsonb) - Additional context
  - `ip_address` (text)
  - `created_at` (timestamptz)

  ### 2. `report_approvals`
  Manages report approval workflow
  - `id` (uuid, primary key)
  - `report_id` (uuid, FK to weekly_reports)
  - `status` (text) - draft, submitted, approved, revision_requested
  - `approver_id` (uuid, FK to profiles)
  - `approved_at` (timestamptz)
  - `feedback` (text)
  - `created_at` (timestamptz)

  ### 3. `report_attachments`
  File attachments for reports
  - `id` (uuid, primary key)
  - `report_id` (uuid, FK to weekly_reports)
  - `file_name` (text)
  - `file_path` (text) - Supabase Storage path
  - `file_size` (bigint)
  - `file_type` (text)
  - `uploaded_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 4. `report_comments`
  Internal comments on reports
  - `id` (uuid, primary key)
  - `report_id` (uuid, FK to weekly_reports)
  - `user_id` (uuid, FK to profiles)
  - `comment` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `report_revisions`
  Version history for reports
  - `id` (uuid, primary key)
  - `report_id` (uuid, FK to weekly_reports)
  - `version` (integer)
  - `data` (jsonb) - Full report snapshot
  - `changed_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 6. `client_budgets`
  Budget tracking per client and service
  - `id` (uuid, primary key)
  - `client_id` (uuid, FK to clients)
  - `service_id` (uuid, FK to services)
  - `monthly_budget` (decimal)
  - `currency` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 7. `client_portal_users`
  Client-side users with read-only access
  - `id` (uuid, primary key)
  - `client_id` (uuid, FK to clients)
  - `email` (text)
  - `full_name` (text)
  - `auth_user_id` (uuid, FK to auth.users)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 8. `performance_benchmarks`
  Industry benchmarks for comparison
  - `id` (uuid, primary key)
  - `service_id` (uuid, FK to services)
  - `industry` (text)
  - `metric_name` (text)
  - `benchmark_value` (decimal)
  - `period` (text)
  - `created_at` (timestamptz)

  ### 9. `custom_metrics`
  User-defined metrics per service
  - `id` (uuid, primary key)
  - `service_id` (uuid, FK to services)
  - `metric_name` (text)
  - `metric_type` (text) - number, currency, percentage
  - `description` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Appropriate policies for admin and employee access
  - Audit logs accessible only to admins
  - Client portal users have restricted access

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible data storage
  - Foreign key constraints ensure data integrity
*/

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- Report Approvals
CREATE TABLE IF NOT EXISTS report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid UNIQUE NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'revision_requested')),
  approver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_approvals_status ON report_approvals(status);
CREATE INDEX IF NOT EXISTS idx_report_approvals_report ON report_approvals(report_id);

-- Report Attachments
CREATE TABLE IF NOT EXISTS report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON report_attachments(report_id);

-- Report Comments
CREATE TABLE IF NOT EXISTS report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_comments_report ON report_comments(report_id);

-- Report Revisions
CREATE TABLE IF NOT EXISTS report_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  version integer NOT NULL,
  data jsonb NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_revisions_report ON report_revisions(report_id);

-- Client Budgets
CREATE TABLE IF NOT EXISTS client_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  monthly_budget decimal(12, 2) NOT NULL,
  currency text DEFAULT 'USD',
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_budgets_client ON client_budgets(client_id);

-- Client Portal Users
CREATE TABLE IF NOT EXISTS client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_users_client ON client_portal_users(client_id);

-- Performance Benchmarks
CREATE TABLE IF NOT EXISTS performance_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  industry text NOT NULL,
  metric_name text NOT NULL,
  benchmark_value decimal(12, 2) NOT NULL,
  period text DEFAULT 'monthly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_service ON performance_benchmarks(service_id);

-- Custom Metrics
CREATE TABLE IF NOT EXISTS custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('number', 'currency', 'percentage')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_metrics_service ON custom_metrics(service_id);

-- Add approval_status column to weekly_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_reports' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE weekly_reports ADD COLUMN approval_status text DEFAULT 'draft' CHECK (approval_status IN ('draft', 'submitted', 'approved', 'revision_requested'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_logs (admin only)
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for report_approvals
CREATE POLICY "Admins can manage all approvals"
  ON report_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own report approvals"
  ON report_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_approvals.report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- RLS Policies for report_attachments
CREATE POLICY "Admins can manage all attachments"
  ON report_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can manage own report attachments"
  ON report_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_attachments.report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- RLS Policies for report_comments
CREATE POLICY "Admins can manage all comments"
  ON report_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view comments on own reports"
  ON report_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_comments.report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can add comments on own reports"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_comments.report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- RLS Policies for report_revisions
CREATE POLICY "Admins can view all revisions"
  ON report_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view own report revisions"
  ON report_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_revisions.report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- RLS Policies for client_budgets
CREATE POLICY "Admins can manage budgets"
  ON client_budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view budgets for assigned clients"
  ON client_budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_assignments.client_id = client_budgets.client_id
      AND client_assignments.employee_id = auth.uid()
    )
  );

-- RLS Policies for client_portal_users
CREATE POLICY "Admins can manage portal users"
  ON client_portal_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for performance_benchmarks
CREATE POLICY "All authenticated users can view benchmarks"
  ON performance_benchmarks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage benchmarks"
  ON performance_benchmarks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for custom_metrics
CREATE POLICY "All authenticated users can view custom metrics"
  ON custom_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage custom metrics"
  ON custom_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for activity logging
DROP TRIGGER IF EXISTS log_clients_activity ON clients;
CREATE TRIGGER log_clients_activity
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS log_profiles_activity ON profiles;
CREATE TRIGGER log_profiles_activity
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS log_assignments_activity ON client_assignments;
CREATE TRIGGER log_assignments_activity
  AFTER INSERT OR UPDATE OR DELETE ON client_assignments
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS log_reports_activity ON weekly_reports;
CREATE TRIGGER log_reports_activity
  AFTER INSERT OR UPDATE OR DELETE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION log_activity();