/*
  # Enhance Client Health Monitoring System

  1. Updates
    - Add health_status enum to clients table (healthy, needs_attention, at_risk)
    - Add last_activity_date to clients table
    - Enhance client_health_scores table
    - Create function to calculate health based on metrics and activity
    - Create automatic triggers to update health scores

  2. Health Calculation Logic
    - No activity for 3+ days → health reduces
    - No activity for 7+ days → at_risk status
    - Metrics tracked: meetings booked, leads generated, responses received
    - Any positive activity → health improves
    
  3. Security
    - Enable RLS on client_health_scores
    - Admins can view all health scores
    - Employees can view health scores for assigned clients only
*/

-- Add health_status to clients table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'health_status'
  ) THEN
    ALTER TABLE clients ADD COLUMN health_status text DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'needs_attention', 'at_risk'));
  END IF;
END $$;

-- Add last_activity_date to clients table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'last_activity_date'
  ) THEN
    ALTER TABLE clients ADD COLUMN last_activity_date timestamptz;
  END IF;
END $$;

-- Add health_score to clients table for quick access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'health_score'
  ) THEN
    ALTER TABLE clients ADD COLUMN health_score numeric DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100);
  END IF;
END $$;

-- Update client_health_scores table structure
ALTER TABLE client_health_scores DROP CONSTRAINT IF EXISTS client_health_scores_client_id_fkey;
ALTER TABLE client_health_scores ADD CONSTRAINT client_health_scores_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clients_health_status ON clients(health_status);
CREATE INDEX IF NOT EXISTS idx_clients_last_activity ON clients(last_activity_date);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_client ON client_health_scores(client_id);

-- Enable RLS on client_health_scores
ALTER TABLE client_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_health_scores
DROP POLICY IF EXISTS "Admins can view all health scores" ON client_health_scores;
CREATE POLICY "Admins can view all health scores"
  ON client_health_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view assigned client health scores" ON client_health_scores;
CREATE POLICY "Employees can view assigned client health scores"
  ON client_health_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_assignments.client_id = client_health_scores.client_id
      AND client_assignments.employee_id = auth.uid()
    )
  );

-- Function to calculate client health score
CREATE OR REPLACE FUNCTION calculate_client_health_score(p_client_id uuid)
RETURNS numeric AS $$
DECLARE
  v_base_score numeric := 100;
  v_health_score numeric;
  v_last_activity timestamptz;
  v_days_since_activity integer;
  v_recent_meetings integer := 0;
  v_recent_leads integer := 0;
  v_recent_positive_responses integer := 0;
  v_report_count integer := 0;
BEGIN
  -- Get last activity date from reports
  SELECT MAX(created_at) INTO v_last_activity
  FROM weekly_reports
  WHERE client_id = p_client_id;

  -- Calculate days since last activity
  IF v_last_activity IS NULL THEN
    v_days_since_activity := 999;
  ELSE
    v_days_since_activity := EXTRACT(DAY FROM (NOW() - v_last_activity));
  END IF;

  -- Count recent reports (last 7 days)
  SELECT COUNT(*) INTO v_report_count
  FROM weekly_reports
  WHERE client_id = p_client_id
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Get metrics from recent reports (last 7 days)
  -- Check activity_metrics for LinkedIn outreach
  SELECT 
    COALESCE(SUM(meetings_booked), 0),
    COALESCE(SUM(positive_responses), 0)
  INTO v_recent_meetings, v_recent_positive_responses
  FROM activity_metrics am
  JOIN weekly_reports wr ON wr.id = am.report_id
  WHERE wr.client_id = p_client_id
    AND wr.created_at >= NOW() - INTERVAL '7 days';

  -- Check service_metrics for other services
  SELECT 
    COALESCE(SUM(COALESCE((metric_data->>'meetings_booked')::integer, 0)), 0) +
    COALESCE(SUM(COALESCE((metric_data->>'leads_generated')::integer, 0)), 0) +
    COALESCE(SUM(COALESCE((metric_data->>'conversions')::integer, 0)), 0)
  INTO v_recent_leads
  FROM service_metrics sm
  JOIN weekly_reports wr ON wr.id = sm.weekly_report_id
  WHERE wr.client_id = p_client_id
    AND wr.created_at >= NOW() - INTERVAL '7 days';

  -- Calculate health score
  v_health_score := v_base_score;

  -- Reduce score based on inactivity
  IF v_days_since_activity >= 7 THEN
    v_health_score := v_health_score - 40;  -- High risk
  ELSIF v_days_since_activity >= 3 THEN
    v_health_score := v_health_score - 20;  -- Needs attention
  END IF;

  -- Reduce score if no reports in last 7 days
  IF v_report_count = 0 THEN
    v_health_score := v_health_score - 30;
  END IF;

  -- Reduce score if no positive metrics
  IF v_recent_meetings = 0 AND v_recent_leads = 0 AND v_recent_positive_responses = 0 THEN
    v_health_score := v_health_score - 20;
  END IF;

  -- Improve score for positive activity
  v_health_score := v_health_score + (v_recent_meetings * 2);  -- +2 per meeting
  v_health_score := v_health_score + (v_recent_leads * 1);      -- +1 per lead
  v_health_score := v_health_score + (v_recent_positive_responses * 1.5);  -- +1.5 per positive response

  -- Cap score between 0 and 100
  v_health_score := LEAST(GREATEST(v_health_score, 0), 100);

  RETURN v_health_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update client health status based on score
CREATE OR REPLACE FUNCTION update_client_health_status(p_client_id uuid)
RETURNS void AS $$
DECLARE
  v_score numeric;
  v_status text;
  v_last_activity timestamptz;
BEGIN
  -- Calculate health score
  v_score := calculate_client_health_score(p_client_id);

  -- Determine status based on score
  IF v_score >= 70 THEN
    v_status := 'healthy';
  ELSIF v_score >= 40 THEN
    v_status := 'needs_attention';
  ELSE
    v_status := 'at_risk';
  END IF;

  -- Get last activity
  SELECT MAX(created_at) INTO v_last_activity
  FROM weekly_reports
  WHERE client_id = p_client_id;

  -- Update client record
  UPDATE clients
  SET 
    health_score = v_score,
    health_status = v_status,
    last_activity_date = v_last_activity,
    updated_at = NOW()
  WHERE id = p_client_id;

  -- Upsert health score record
  INSERT INTO client_health_scores (
    id,
    client_id,
    score,
    factors,
    calculated_at,
    next_review_date
  )
  VALUES (
    gen_random_uuid(),
    p_client_id,
    v_score,
    jsonb_build_object(
      'last_activity', v_last_activity,
      'status', v_status
    ),
    NOW(),
    CURRENT_DATE + INTERVAL '7 days'
  )
  ON CONFLICT (client_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    factors = EXCLUDED.factors,
    calculated_at = EXCLUDED.calculated_at,
    next_review_date = EXCLUDED.next_review_date;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'client_health_scores_client_id_key'
  ) THEN
    ALTER TABLE client_health_scores ADD CONSTRAINT client_health_scores_client_id_key UNIQUE (client_id);
  END IF;
END $$;

-- Function to update all client health scores
CREATE OR REPLACE FUNCTION update_all_client_health_scores()
RETURNS void AS $$
DECLARE
  v_client_id uuid;
BEGIN
  FOR v_client_id IN SELECT id FROM clients WHERE status = 'active'
  LOOP
    PERFORM update_client_health_status(v_client_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update health when a report is created or updated
CREATE OR REPLACE FUNCTION trigger_update_client_health()
RETURNS TRIGGER AS $$
BEGIN
  -- Update health for the client
  PERFORM update_client_health_status(NEW.client_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on weekly_reports
DROP TRIGGER IF EXISTS update_client_health_on_report ON weekly_reports;
CREATE TRIGGER update_client_health_on_report
  AFTER INSERT OR UPDATE ON weekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_client_health();

-- Initialize health scores for all existing active clients
SELECT update_all_client_health_scores();
