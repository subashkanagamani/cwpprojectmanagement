-- Create skill_matrix table for Resource Management
CREATE TABLE IF NOT EXISTS skill_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill text NOT NULL,
  proficiency text DEFAULT 'beginner' CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_matrix_employee ON skill_matrix(employee_id);
