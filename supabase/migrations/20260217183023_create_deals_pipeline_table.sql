/*
  # Create Deals/Pipeline Table

  1. New Tables
    - `deals`
      - `id` (uuid, primary key) - Unique identifier
      - `client_id` (uuid, foreign key) - Reference to clients table
      - `deal_name` (text) - Name of the deal
      - `deal_value` (numeric) - Monetary value of the deal
      - `stage` (text) - Pipeline stage (prospecting, qualified, proposal, negotiation, closed_won, closed_lost)
      - `probability` (integer) - Win probability percentage (0-100)
      - `expected_close_date` (date) - Expected closing date
      - `owner_id` (uuid, foreign key) - Employee responsible for the deal
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `status` (text) - Current status (active, won, lost, on_hold)
  
  2. Security
    - Enable RLS on `deals` table
    - Add policies for authenticated users to manage deals based on role
*/

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  deal_name text NOT NULL,
  deal_value numeric(12, 2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'on_hold'))
);

-- Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Admins can view all deals
CREATE POLICY "Admins can view all deals"
  ON deals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Deal owners can view their deals
CREATE POLICY "Deal owners can view their deals"
  ON deals FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Admins can insert deals
CREATE POLICY "Admins can insert deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update deals
CREATE POLICY "Admins can update deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Deal owners can update their deals
CREATE POLICY "Deal owners can update their deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins can delete deals
CREATE POLICY "Admins can delete deals"
  ON deals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);