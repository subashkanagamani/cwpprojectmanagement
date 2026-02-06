/*
  # Add Missing Platform Features

  This migration adds new tables for features not yet in the database.
  
  ## New Tables
    - notification_preferences
    - email_templates
    - email_logs
    - timesheets
    - goals
    - goal_progress
    - communications
    - meeting_notes
    - internal_comments
    - mentions
    - resource_allocations
    - time_off_requests
    - skill_matrix
    - performance_metrics
    - client_health_scores
    - benchmarks
    - calendar_events
    - reminders
    - user_preferences
    - dashboard_widgets
    - saved_filters
    - data_exports
    
  ## Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  email_digest text DEFAULT 'daily' CHECK (email_digest IN ('realtime', 'daily', 'weekly', 'never')),
  browser_enabled boolean DEFAULT true,
  deadline_reminders boolean DEFAULT true,
  mention_notifications boolean DEFAULT true,
  approval_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('report_delivery', 'deadline_reminder', 'welcome', 'status_update', 'custom')),
  variables jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  template_id uuid REFERENCES email_templates(id),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at timestamptz DEFAULT now(),
  error_message text
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  total_hours numeric(6,2) DEFAULT 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, week_start)
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage their timesheets"
  ON timesheets FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins view and approve timesheets"
  ON timesheets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id),
  title text NOT NULL,
  description text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  start_date date NOT NULL,
  target_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage goals"
  ON goals FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees view goals for their clients"
  ON goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments ca
      WHERE ca.client_id = goals.client_id
      AND ca.employee_id = auth.uid()
    )
  );

-- Goal Progress
CREATE TABLE IF NOT EXISTS goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  value numeric NOT NULL,
  notes text,
  recorded_by uuid REFERENCES profiles(id) NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view goal progress"
  ON goal_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM goals g
      JOIN client_assignments ca ON ca.client_id = g.client_id
      WHERE g.id = goal_progress.goal_id
      AND ca.employee_id = auth.uid()
    )
  );

CREATE POLICY "Users add goal progress"
  ON goal_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recorded_by);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'message', 'other')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  summary text NOT NULL,
  content text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage communications"
  ON communications FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees view communications for their clients"
  ON communications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments ca
      WHERE ca.client_id = communications.client_id
      AND ca.employee_id = auth.uid()
    )
  );

-- Meeting Notes
CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date timestamptz NOT NULL,
  attendees jsonb DEFAULT '[]',
  agenda text,
  notes text NOT NULL,
  action_items jsonb DEFAULT '[]',
  next_meeting timestamptz,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meeting notes"
  ON meeting_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees view meeting notes for their clients"
  ON meeting_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments ca
      WHERE ca.client_id = meeting_notes.client_id
      AND ca.employee_id = auth.uid()
    )
  );

-- Internal Comments
CREATE TABLE IF NOT EXISTS internal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'report', 'goal', 'timesheet')),
  entity_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE internal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create internal comments"
  ON internal_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view internal comments"
  ON internal_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Comment authors update their comments"
  ON internal_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Mentions
CREATE TABLE IF NOT EXISTS mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES internal_comments(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their mentions"
  ON mentions FOR SELECT
  TO authenticated
  USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users update their mentions"
  ON mentions FOR UPDATE
  TO authenticated
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

CREATE POLICY "System creates mentions"
  ON mentions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Resource Allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) NOT NULL,
  allocated_hours numeric(5,2) NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, client_id, service_id, week_start)
);

ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage resource allocations"
  ON resource_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees view their allocations"
  ON resource_allocations FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Time Off Requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage their time off requests"
  ON time_off_requests FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins view and approve time off"
  ON time_off_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Skill Matrix
CREATE TABLE IF NOT EXISTS skill_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill text NOT NULL,
  proficiency text NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience numeric(3,1),
  last_used date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, skill)
);

ALTER TABLE skill_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage their skill matrix"
  ON skill_matrix FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins view all skills"
  ON skill_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'employee', 'service')),
  entity_id uuid NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage performance metrics"
  ON performance_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees view their metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    entity_type = 'employee' AND entity_id = auth.uid()
  );

-- Client Health Scores
CREATE TABLE IF NOT EXISTS client_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  health_score numeric(3,1) NOT NULL CHECK (health_score >= 0 AND health_score <= 10),
  factors jsonb DEFAULT '{}',
  calculated_at timestamptz DEFAULT now()
);

ALTER TABLE client_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage health scores"
  ON client_health_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Benchmarks
CREATE TABLE IF NOT EXISTS benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  service_id uuid REFERENCES services(id) NOT NULL,
  metric_name text NOT NULL,
  average_value numeric NOT NULL,
  top_quartile_value numeric,
  data_source text,
  period date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views benchmarks"
  ON benchmarks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage benchmarks"
  ON benchmarks FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('deadline', 'meeting', 'milestone', 'reminder')),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  attendees jsonb DEFAULT '[]',
  location text,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view relevant calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (attendees ? auth.uid()::text) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users create calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users update their events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'browser', 'both')),
  remind_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their reminders"
  ON reminders FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  items_per_page int DEFAULT 10,
  default_view text DEFAULT 'list',
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Dashboard Widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  widget_type text NOT NULL,
  position int NOT NULL,
  size text DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  config jsonb DEFAULT '{}',
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their dashboard widgets"
  ON dashboard_widgets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Saved Filters
CREATE TABLE IF NOT EXISTS saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  page text NOT NULL,
  filters jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their saved filters"
  ON saved_filters FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Data Exports
CREATE TABLE IF NOT EXISTS data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  export_type text NOT NULL,
  format text NOT NULL CHECK (format IN ('csv', 'json', 'pdf', 'xlsx', 'html')),
  filters jsonb DEFAULT '{}',
  file_path text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their exports"
  ON data_exports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all exports"
  ON data_exports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_communications_client_created ON communications(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_goals_client_status ON goals(client_id, status);
CREATE INDEX IF NOT EXISTS idx_time_entries_emp_date ON time_entries(employee_id, date);
