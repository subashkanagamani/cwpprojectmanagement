/*
  # Comprehensive System Enhancements

  ## New Tables
  
  1. **report_drafts** - Save report drafts before submission
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references profiles)
    - `client_id` (uuid, references clients)
    - `service_id` (uuid, references services)
    - `week_start_date` (date)
    - `draft_data` (jsonb) - stores form data
    - `created_at` (timestamp)
    - `updated_at` (timestamp)
  
  2. **report_attachments** - File attachments for reports
    - `id` (uuid, primary key)
    - `report_id` (uuid, references weekly_reports)
    - `file_name` (text)
    - `file_url` (text)
    - `file_type` (text)
    - `file_size` (integer)
    - `uploaded_by` (uuid, references profiles)
    - `created_at` (timestamp)
  
  3. **activity_metrics** - Detailed activity tracking (LinkedIn, etc.)
    - `id` (uuid, primary key)
    - `report_id` (uuid, references weekly_reports)
    - `metric_type` (text) - linkedin_connections, emails, meetings, etc.
    - `connections_sent` (integer)
    - `connections_accepted` (integer)
    - `responses_received` (integer)
    - `positive_responses` (integer)
    - `meetings_booked` (integer)
    - `meeting_dates` (jsonb) - array of dates
    - `custom_metrics` (jsonb) - flexible metrics storage
    - `created_at` (timestamp)
  
  4. **report_templates** - Reusable report templates
    - `id` (uuid, primary key)
    - `name` (text)
    - `description` (text)
    - `template_data` (jsonb)
    - `created_by` (uuid, references profiles)
    - `is_default` (boolean)
    - `created_at` (timestamp)
  
  5. **report_comments** - Comments on reports
    - `id` (uuid, primary key)
    - `report_id` (uuid, references weekly_reports)
    - `user_id` (uuid, references profiles)
    - `comment` (text)
    - `is_internal` (boolean) - visible only to admins
    - `created_at` (timestamp)
  
  6. **employee_tasks** - Task management for employees
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references profiles)
    - `title` (text)
    - `description` (text)
    - `due_date` (date)
    - `priority` (text) - low, medium, high, urgent
    - `status` (text) - pending, in_progress, completed
    - `created_by` (uuid, references profiles)
    - `created_at` (timestamp)
    - `completed_at` (timestamp)
  
  7. **client_notes** - Private notes about clients
    - `id` (uuid, primary key)
    - `client_id` (uuid, references clients)
    - `employee_id` (uuid, references profiles)
    - `note` (text)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)
  
  8. **time_entries** - Time tracking
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references profiles)
    - `client_id` (uuid, references clients)
    - `service_id` (uuid, references services)
    - `hours` (decimal)
    - `date` (date)
    - `description` (text)
    - `created_at` (timestamp)
  
  9. **notifications** - System notifications
    - `id` (uuid, primary key)
    - `user_id` (uuid, references profiles)
    - `title` (text)
    - `message` (text)
    - `type` (text) - info, warning, error, success
    - `is_read` (boolean)
    - `link` (text)
    - `created_at` (timestamp)
  
  10. **budget_alerts** - Budget alert configuration
    - `id` (uuid, primary key)
    - `client_budget_id` (uuid, references client_budgets)
    - `threshold_percentage` (integer) - 75, 90, 100
    - `alert_sent` (boolean)
    - `alert_sent_at` (timestamp)
    - `created_at` (timestamp)
  
  11. **shared_documents** - Document sharing with clients
    - `id` (uuid, primary key)
    - `client_id` (uuid, references clients)
    - `file_name` (text)
    - `file_url` (text)
    - `file_type` (text)
    - `uploaded_by` (uuid, references profiles)
    - `description` (text)
    - `created_at` (timestamp)
  
  12. **report_feedback** - Client feedback on reports
    - `id` (uuid, primary key)
    - `report_id` (uuid, references weekly_reports)
    - `portal_user_id` (uuid, references client_portal_users)
    - `rating` (integer) - 1-5
    - `feedback` (text)
    - `created_at` (timestamp)

  ## Modifications to Existing Tables
  
  - Add `is_draft` to weekly_reports
  - Add `last_auto_saved` to weekly_reports
  - Add `report_template_id` to weekly_reports
  - Add `last_login_at` to client_portal_users
  - Add `custom_fields` (jsonb) to clients and profiles
  - Add `report_due_day` to clients (which day of week reports are due)
  
  ## Triggers for Activity Logging
  
  - Auto-populate activity_logs on all major table changes
  
  ## Security
  
  - Enable RLS on all new tables
  - Add appropriate policies for authenticated users
*/

-- Report Drafts
CREATE TABLE IF NOT EXISTS report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  draft_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, client_id, service_id, week_start_date)
);

ALTER TABLE report_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own report drafts"
  ON report_drafts FOR ALL
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

-- Report Attachments
CREATE TABLE IF NOT EXISTS report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view report attachments"
  ON report_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload attachments to own reports"
  ON report_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- Activity Metrics
CREATE TABLE IF NOT EXISTS activity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  metric_type text DEFAULT 'linkedin_outreach',
  connections_sent integer DEFAULT 0,
  connections_accepted integer DEFAULT 0,
  responses_received integer DEFAULT 0,
  positive_responses integer DEFAULT 0,
  meetings_booked integer DEFAULT 0,
  meeting_dates jsonb DEFAULT '[]'::jsonb,
  custom_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity metrics for accessible reports"
  ON activity_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports wr
      JOIN client_assignments ca ON ca.client_id = wr.client_id
      WHERE wr.id = report_id
      AND (ca.employee_id = auth.uid() OR wr.employee_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Employees can manage metrics for own reports"
  ON activity_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_reports
      WHERE weekly_reports.id = report_id
      AND weekly_reports.employee_id = auth.uid()
    )
  );

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_data jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON report_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Report Comments
CREATE TABLE IF NOT EXISTS report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report comments"
  ON report_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reports wr
      WHERE wr.id = report_id
      AND wr.employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can add comments"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Employee Tasks
CREATE TABLE IF NOT EXISTS employee_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON employee_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id OR auth.uid() = created_by);

CREATE POLICY "Users can update own tasks"
  ON employee_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admins can manage all tasks"
  ON employee_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Client Notes
CREATE TABLE IF NOT EXISTS client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own client notes"
  ON client_notes FOR ALL
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admins can view all client notes"
  ON client_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  service_id uuid REFERENCES services(id),
  hours decimal(10,2) NOT NULL,
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own time entries"
  ON time_entries FOR ALL
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admins can view all time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Budget Alerts
CREATE TABLE IF NOT EXISTS budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_budget_id uuid REFERENCES client_budgets(id) ON DELETE CASCADE NOT NULL,
  threshold_percentage integer NOT NULL CHECK (threshold_percentage IN (75, 90, 100)),
  alert_sent boolean DEFAULT false,
  alert_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_budget_id, threshold_percentage)
);

ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage budget alerts"
  ON budget_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Shared Documents
CREATE TABLE IF NOT EXISTS shared_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shared documents"
  ON shared_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage shared documents"
  ON shared_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Report Feedback
CREATE TABLE IF NOT EXISTS report_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  portal_user_id uuid REFERENCES client_portal_users(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal users can manage own feedback"
  ON report_feedback FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_portal_users
      WHERE client_portal_users.id = portal_user_id
      AND client_portal_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_portal_users
      WHERE client_portal_users.id = portal_user_id
      AND client_portal_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all feedback"
  ON report_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Modify existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_reports' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE weekly_reports ADD COLUMN is_draft boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_reports' AND column_name = 'last_auto_saved'
  ) THEN
    ALTER TABLE weekly_reports ADD COLUMN last_auto_saved timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_reports' AND column_name = 'report_template_id'
  ) THEN
    ALTER TABLE weekly_reports ADD COLUMN report_template_id uuid REFERENCES report_templates(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_portal_users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE client_portal_users ADD COLUMN last_login_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE clients ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE profiles ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'report_due_day'
  ) THEN
    ALTER TABLE clients ADD COLUMN report_due_day integer DEFAULT 5 CHECK (report_due_day >= 0 AND report_due_day <= 6);
  END IF;
END $$;

-- Create trigger function for activity logging
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      'created',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (user_id, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      'updated',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (user_id, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      'deleted',
      TG_TABLE_NAME,
      OLD.id::text,
      jsonb_build_object('old', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to major tables
DROP TRIGGER IF EXISTS clients_activity_log ON clients;
CREATE TRIGGER clients_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS employees_activity_log ON profiles;
CREATE TRIGGER employees_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS weekly_reports_activity_log ON weekly_reports;
CREATE TRIGGER weekly_reports_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS client_assignments_activity_log ON client_assignments;
CREATE TRIGGER client_assignments_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON client_assignments
  FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS client_budgets_activity_log ON client_budgets;
CREATE TRIGGER client_budgets_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON client_budgets
  FOR EACH ROW EXECUTE FUNCTION log_activity();