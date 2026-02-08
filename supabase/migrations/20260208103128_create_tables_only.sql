/*
  # ClientFlow Database Tables
  
  Phase 1: Create all database tables without RLS policies
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  skills jsonb DEFAULT '[]'::jsonb,
  max_capacity integer DEFAULT 5,
  phone text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  status text NOT NULL DEFAULT 'active',
  start_date date DEFAULT CURRENT_DATE,
  notes text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  priority text DEFAULT 'medium',
  health_status text DEFAULT 'healthy',
  health_score numeric DEFAULT 100,
  last_activity_date timestamptz,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  report_due_day integer DEFAULT 5,
  weekly_meeting_day integer,
  meeting_time text DEFAULT '10:00',
  meeting_reminder_hours integer DEFAULT 24,
  deleted_at timestamptz,
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
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, service_id)
);

-- Create client_assignments table
CREATE TABLE IF NOT EXISTS client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_assignments_unique 
  ON client_assignments(client_id, employee_id, service_id) 
  WHERE deleted_at IS NULL;

-- Create weekly_reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  work_summary text,
  status text NOT NULL DEFAULT 'draft',
  key_wins text,
  challenges text,
  next_week_plan text,
  approval_status text DEFAULT 'draft',
  is_draft boolean DEFAULT false,
  last_auto_saved timestamptz,
  report_template_id uuid,
  submitted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create remaining tables
CREATE TABLE IF NOT EXISTS service_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  metric_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  approver_id uuid,
  approved_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text,
  file_url text,
  file_size integer NOT NULL,
  file_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  version integer NOT NULL,
  data jsonb NOT NULL,
  changed_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  monthly_budget numeric(12, 2) NOT NULL,
  actual_spending numeric(10, 2) DEFAULT 0,
  budget_utilization numeric(5, 2) DEFAULT 0,
  currency text DEFAULT 'USD',
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  industry text NOT NULL,
  metric_name text NOT NULL,
  benchmark_value numeric(12, 2) NOT NULL,
  period text DEFAULT 'monthly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  metric_name text NOT NULL,
  metric_type text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

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
  metric_name text,
  metric_value numeric DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_data jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  hours numeric(10, 2) NOT NULL,
  date date NOT NULL,
  description text,
  is_billable boolean DEFAULT true,
  hourly_rate numeric(10, 2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_budget_id uuid REFERENCES client_budgets(id) ON DELETE CASCADE NOT NULL,
  threshold_percentage integer NOT NULL,
  alert_sent boolean DEFAULT false,
  alert_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid NOT NULL,
  description text,
  file_size integer DEFAULT 0,
  permissions text DEFAULT 'view',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE NOT NULL,
  portal_user_id uuid REFERENCES client_portal_users(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_by uuid,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  remarks text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);

CREATE TABLE IF NOT EXISTS client_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  tool_name text NOT NULL,
  username text NOT NULL,
  encrypted_password text NOT NULL,
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  start_date date NOT NULL,
  target_date date NOT NULL,
  status text DEFAULT 'active',
  priority text DEFAULT 'medium',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  value numeric NOT NULL,
  notes text,
  recorded_by uuid NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  direction text NOT NULL,
  subject text,
  summary text NOT NULL,
  content text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communications_client_created ON communications(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date timestamptz NOT NULL,
  attendees jsonb DEFAULT '[]'::jsonb,
  agenda text,
  notes text NOT NULL,
  action_items jsonb DEFAULT '[]'::jsonb,
  next_meeting timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  attendees jsonb DEFAULT '[]'::jsonb,
  location text,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

CREATE TABLE IF NOT EXISTS resource_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  allocated_hours numeric(5, 2) NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, client_id, service_id, week_start)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  template_type text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  score numeric(3, 1) NOT NULL,
  factors jsonb DEFAULT '{}'::jsonb,
  calculated_at timestamptz DEFAULT now(),
  next_review_date date
);

CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  status text DEFAULT 'draft',
  total_hours numeric(6, 2) DEFAULT 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, week_start)
);

CREATE TABLE IF NOT EXISTS internal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_comments_entity ON internal_comments(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filter_name text NOT NULL,
  page text NOT NULL,
  filter_data jsonb NOT NULL,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY,
  theme text DEFAULT 'light',
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h',
  items_per_page integer DEFAULT 10,
  default_view text DEFAULT 'list',
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  widget_type text NOT NULL,
  position integer NOT NULL,
  size text DEFAULT 'medium',
  config jsonb DEFAULT '{}'::jsonb,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY,
  email_enabled boolean DEFAULT true,
  email_digest text DEFAULT 'daily',
  browser_enabled boolean DEFAULT true,
  deadline_reminders boolean DEFAULT true,
  mention_notifications boolean DEFAULT true,
  approval_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
