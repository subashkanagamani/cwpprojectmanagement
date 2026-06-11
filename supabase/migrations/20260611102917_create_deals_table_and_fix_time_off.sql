-- Create deals table (DealsPage queries 'deals' not 'deals_pipeline')
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  deal_name text NOT NULL,
  deal_value numeric DEFAULT 0,
  stage text DEFAULT 'prospecting',
  probability integer DEFAULT 0,
  expected_close_date date,
  owner_id uuid REFERENCES profiles(id),
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- time_off_requests needs approved_at column (referenced in TimeOffPage)
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;