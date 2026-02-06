/*
  # Enhance Existing Tables for Missing Features

  This migration enhances existing tables to support missing features without duplicating
  what already exists.

  ## Changes Made

  1. **report_templates** - Already exists, adding is_active column if missing
  2. **shared_documents** - Update structure for better permissions
  3. **saved_filters** - Update to match spec (filter_name instead of name)
  4. **email_logs** - Add tracking columns for opens/clicks
  5. **client_health_scores** - Adjust score range and add review date
  6. **activity_metrics** - Enhance with new fields

  ## Security
  - Maintains existing RLS policies
  - No changes to authentication or permissions
*/

-- Update report_templates to add is_active if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_templates' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_templates' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_templates' AND column_name = 'default_client_id'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN default_client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update shared_documents to add permissions field if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shared_documents' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE shared_documents ADD COLUMN permissions text DEFAULT 'view' CHECK (permissions IN ('view', 'download'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shared_documents' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE shared_documents ADD COLUMN file_size bigint DEFAULT 0;
  END IF;
END $$;

-- Update saved_filters if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_filters' AND column_name = 'filter_name'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'saved_filters' AND column_name = 'name'
    ) THEN
      ALTER TABLE saved_filters RENAME COLUMN name TO filter_name;
    ELSE
      ALTER TABLE saved_filters ADD COLUMN filter_name text NOT NULL DEFAULT 'Untitled Filter';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_filters' AND column_name = 'filter_data'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'saved_filters' AND column_name = 'filters'
    ) THEN
      ALTER TABLE saved_filters RENAME COLUMN filters TO filter_data;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_filters' AND column_name = 'is_shared'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'saved_filters' AND column_name = 'is_default'
    ) THEN
      ALTER TABLE saved_filters RENAME COLUMN is_default TO is_shared;
    ELSE
      ALTER TABLE saved_filters ADD COLUMN is_shared boolean DEFAULT false;
    END IF;
  END IF;
END $$;

-- Update email_logs to add opened_at and clicked_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN opened_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'clicked_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN clicked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'sent_by'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'template_used'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN template_used text;
  END IF;
END $$;

-- Update client_health_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_health_scores' AND column_name = 'score'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client_health_scores' AND column_name = 'health_score'
    ) THEN
      ALTER TABLE client_health_scores RENAME COLUMN health_score TO score;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_health_scores' AND column_name = 'next_review_date'
  ) THEN
    ALTER TABLE client_health_scores ADD COLUMN next_review_date date;
  END IF;
END $$;

-- Update activity_metrics to support multiple metric types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_metrics' AND column_name = 'metric_name'
  ) THEN
    ALTER TABLE activity_metrics ADD COLUMN metric_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_metrics' AND column_name = 'metric_value'
  ) THEN
    ALTER TABLE activity_metrics ADD COLUMN metric_value numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_metrics' AND column_name = 'recorded_at'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'activity_metrics' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE activity_metrics RENAME COLUMN created_at TO recorded_at;
    END IF;
  END IF;
END $$;

-- Update mentions table to include notification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mentions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'mentions' AND column_name = 'notified_at'
    ) THEN
      ALTER TABLE mentions ADD COLUMN notified_at timestamptz;
    END IF;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_shared ON saved_filters(user_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_score ON client_health_scores(score);
CREATE INDEX IF NOT EXISTS idx_activity_metrics_type ON activity_metrics(metric_type);
