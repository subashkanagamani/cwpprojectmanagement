/*
  # Fix Budget Alerts Schema

  1. Changes to `budget_alerts` table
    - Add `alert_type` column (warning, critical)
    - Add `message` column for alert description
    - Add `is_active` column to replace alert_sent logic
    - Keep existing columns for backward compatibility
  
  2. Notes
    - alert_type can be derived from threshold_percentage
    - is_active = NOT alert_sent (for existing records)
    - message will store descriptive alert text
*/

-- Add missing columns to budget_alerts table
DO $$
BEGIN
  -- Add alert_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_alerts' AND column_name = 'alert_type'
  ) THEN
    ALTER TABLE budget_alerts 
    ADD COLUMN alert_type text CHECK (alert_type IN ('warning', 'critical'));
  END IF;

  -- Add message column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_alerts' AND column_name = 'message'
  ) THEN
    ALTER TABLE budget_alerts 
    ADD COLUMN message text;
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_alerts' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE budget_alerts 
    ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Update existing records to set alert_type based on threshold_percentage
UPDATE budget_alerts 
SET alert_type = CASE 
  WHEN threshold_percentage >= 100 THEN 'critical'
  ELSE 'warning'
END
WHERE alert_type IS NULL;

-- Update is_active based on alert_sent
UPDATE budget_alerts 
SET is_active = NOT alert_sent
WHERE is_active IS NULL;

-- Generate messages for existing alerts
UPDATE budget_alerts 
SET message = 'Budget threshold of ' || threshold_percentage || '% has been reached'
WHERE message IS NULL;

-- Make alert_type and message required going forward
ALTER TABLE budget_alerts 
ALTER COLUMN alert_type SET NOT NULL,
ALTER COLUMN message SET NOT NULL;
