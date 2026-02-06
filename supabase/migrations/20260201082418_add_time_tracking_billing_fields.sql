/*
  # Add Billing Fields to Time Tracking

  1. Changes
    - Add `is_billable` boolean field to time_entries table (defaults to true)
    - Add `hourly_rate` numeric field to time_entries table (nullable for non-billable entries)
  
  2. Purpose
    - Enable billable vs non-billable time tracking
    - Store hourly rates for revenue calculations
    - Support billing reports and client invoicing
*/

DO $$
BEGIN
  -- Add is_billable column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'is_billable'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN is_billable boolean DEFAULT true NOT NULL;
  END IF;

  -- Add hourly_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN hourly_rate numeric(10,2);
  END IF;
END $$;