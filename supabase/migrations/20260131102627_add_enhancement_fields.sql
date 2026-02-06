/*
  # Add Enhancement Fields for Complete Feature Set

  1. Clients Table Enhancements
    - `contact_name` (text) - Primary contact person name
    - `contact_email` (text) - Contact email address
    - `contact_phone` (text) - Contact phone number
    - `website` (text) - Client website URL
    - `priority` (text) - Priority level: low, medium, high, critical
    - `health_status` (text) - Health status: healthy, needs_attention, at_risk

  2. Profiles Table Enhancements
    - `skills` (jsonb) - Array of service expertise/skills
    - `max_capacity` (integer) - Maximum number of clients they can handle
    - `hourly_rate` (decimal) - Employee hourly rate
    - `phone` (text) - Employee phone number

  3. Client Budgets Table Enhancements
    - `actual_spending` (decimal) - Actual amount spent
    - `budget_utilization` (decimal) - Percentage of budget used (computed)

  4. Security
    - All existing RLS policies remain in place
    - New columns follow the same security model
*/

-- Add new fields to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE clients ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE clients ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE clients ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'website'
  ) THEN
    ALTER TABLE clients ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'priority'
  ) THEN
    ALTER TABLE clients ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'health_status'
  ) THEN
    ALTER TABLE clients ADD COLUMN health_status text DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'needs_attention', 'at_risk'));
  END IF;
END $$;

-- Add new fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'skills'
  ) THEN
    ALTER TABLE profiles ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'max_capacity'
  ) THEN
    ALTER TABLE profiles ADD COLUMN max_capacity integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE profiles ADD COLUMN hourly_rate decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Add new fields to client_budgets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_budgets' AND column_name = 'actual_spending'
  ) THEN
    ALTER TABLE client_budgets ADD COLUMN actual_spending decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_budgets' AND column_name = 'budget_utilization'
  ) THEN
    ALTER TABLE client_budgets ADD COLUMN budget_utilization decimal(5,2) DEFAULT 0;
  END IF;
END $$;

-- Create a function to automatically calculate budget utilization
CREATE OR REPLACE FUNCTION calculate_budget_utilization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.monthly_budget > 0 THEN
    NEW.budget_utilization := (NEW.actual_spending / NEW.monthly_budget) * 100;
  ELSE
    NEW.budget_utilization := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update budget utilization
DROP TRIGGER IF EXISTS update_budget_utilization ON client_budgets;
CREATE TRIGGER update_budget_utilization
  BEFORE INSERT OR UPDATE OF actual_spending, monthly_budget ON client_budgets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_budget_utilization();