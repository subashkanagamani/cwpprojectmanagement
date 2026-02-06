/*
  # Add Weekly Meeting Prioritization System

  1. Updates to Clients Table
    - Add weekly_meeting_day (0=Sunday, 1=Monday, ..., 6=Saturday)
    - Add meeting_time for more precise scheduling
    - Add meeting_reminder_hours for notification timing

  2. Task Priority Calculation
    - Create function to calculate days until next client meeting
    - Create function to auto-prioritize tasks based on meeting proximity
    - Tasks for clients with meetings in 0-1 days get highest priority
    - Tasks for clients with meetings in 2-3 days get medium priority

  3. Enhanced Task View
    - Add computed priority score to tasks
    - Include meeting_priority field for sorting

  4. Security
    - Existing RLS policies apply
    - No new security changes needed
*/

-- Add meeting fields to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'weekly_meeting_day'
  ) THEN
    ALTER TABLE clients ADD COLUMN weekly_meeting_day integer CHECK (weekly_meeting_day >= 0 AND weekly_meeting_day <= 6);
    COMMENT ON COLUMN clients.weekly_meeting_day IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'meeting_time'
  ) THEN
    ALTER TABLE clients ADD COLUMN meeting_time time DEFAULT '10:00:00';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'meeting_reminder_hours'
  ) THEN
    ALTER TABLE clients ADD COLUMN meeting_reminder_hours integer DEFAULT 24;
  END IF;
END $$;

-- Function to calculate days until next meeting for a client
CREATE OR REPLACE FUNCTION days_until_next_meeting(p_weekly_meeting_day integer)
RETURNS integer AS $$
DECLARE
  v_current_day integer;
  v_days_until integer;
BEGIN
  -- Get current day of week (0=Sunday, 1=Monday, etc.)
  v_current_day := EXTRACT(DOW FROM CURRENT_DATE);
  
  -- If no meeting day set, return high number (low priority)
  IF p_weekly_meeting_day IS NULL THEN
    RETURN 999;
  END IF;
  
  -- Calculate days until next occurrence
  IF p_weekly_meeting_day >= v_current_day THEN
    v_days_until := p_weekly_meeting_day - v_current_day;
  ELSE
    v_days_until := 7 - v_current_day + p_weekly_meeting_day;
  END IF;
  
  RETURN v_days_until;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate meeting-based priority score (0-100, higher = more urgent)
CREATE OR REPLACE FUNCTION calculate_meeting_priority(p_weekly_meeting_day integer, p_task_priority text DEFAULT 'medium')
RETURNS integer AS $$
DECLARE
  v_days_until integer;
  v_base_priority integer := 50;
  v_meeting_boost integer := 0;
BEGIN
  v_days_until := days_until_next_meeting(p_weekly_meeting_day);
  
  -- Adjust base priority based on task's own priority
  CASE p_task_priority
    WHEN 'critical' THEN v_base_priority := 90;
    WHEN 'high' THEN v_base_priority := 70;
    WHEN 'medium' THEN v_base_priority := 50;
    WHEN 'low' THEN v_base_priority := 30;
    ELSE v_base_priority := 50;
  END CASE;
  
  -- Add meeting proximity boost
  CASE
    WHEN v_days_until = 0 THEN v_meeting_boost := 50;  -- Meeting today!
    WHEN v_days_until = 1 THEN v_meeting_boost := 40;  -- Meeting tomorrow
    WHEN v_days_until = 2 THEN v_meeting_boost := 25;  -- Meeting in 2 days
    WHEN v_days_until <= 3 THEN v_meeting_boost := 15; -- Meeting in 3 days
    WHEN v_days_until <= 5 THEN v_meeting_boost := 5;  -- Meeting this week
    ELSE v_meeting_boost := 0;
  END CASE;
  
  -- Cap at 100
  RETURN LEAST(v_base_priority + v_meeting_boost, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for tasks with meeting-based priority
CREATE OR REPLACE VIEW tasks_with_meeting_priority AS
SELECT 
  t.*,
  c.weekly_meeting_day,
  c.meeting_time,
  c.name as client_name,
  days_until_next_meeting(c.weekly_meeting_day) as days_until_meeting,
  calculate_meeting_priority(c.weekly_meeting_day, t.priority::text) as meeting_priority_score,
  CASE 
    WHEN days_until_next_meeting(c.weekly_meeting_day) = 0 THEN 'Meeting Today'
    WHEN days_until_next_meeting(c.weekly_meeting_day) = 1 THEN 'Meeting Tomorrow'
    WHEN days_until_next_meeting(c.weekly_meeting_day) <= 3 THEN 'Meeting This Week'
    ELSE 'No Upcoming Meeting'
  END as meeting_urgency_label
FROM tasks t
LEFT JOIN clients c ON t.client_id = c.id;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_meeting_day ON clients(weekly_meeting_day) WHERE weekly_meeting_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_client_assigned ON tasks(client_id, assigned_to);

-- Grant access to the view
GRANT SELECT ON tasks_with_meeting_priority TO authenticated;

-- Add RLS to the view (inherits from tasks table)
ALTER VIEW tasks_with_meeting_priority SET (security_invoker = on);

-- Function to get prioritized tasks for an employee
CREATE OR REPLACE FUNCTION get_prioritized_tasks_for_employee(p_employee_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  client_id uuid,
  client_name text,
  assigned_to uuid,
  due_date date,
  created_at timestamptz,
  updated_at timestamptz,
  weekly_meeting_day integer,
  meeting_time time,
  days_until_meeting integer,
  meeting_priority_score integer,
  meeting_urgency_label text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.client_id,
    t.client_name,
    t.assigned_to,
    t.due_date,
    t.created_at,
    t.updated_at,
    t.weekly_meeting_day,
    t.meeting_time,
    t.days_until_meeting,
    t.meeting_priority_score,
    t.meeting_urgency_label
  FROM tasks_with_meeting_priority t
  WHERE t.assigned_to = p_employee_id
    AND t.status != 'completed'
  ORDER BY 
    t.meeting_priority_score DESC,
    t.days_until_meeting ASC,
    t.due_date ASC NULLS LAST,
    t.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_prioritized_tasks_for_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION days_until_next_meeting(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_meeting_priority(integer, text) TO authenticated;
