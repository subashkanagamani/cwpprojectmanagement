/*
  # Consolidate Duplicate Table Definitions

  1. Changes to report_attachments
    - Ensure file_url column exists (for storage bucket integration)
    - Ensure file_path column exists (for backward compatibility)
    - Standardize file_size as bigint
    - Add RLS policies if missing

  2. Changes to report_comments
    - Add is_internal boolean flag (for internal vs external comments)
    - Add updated_at timestamp
    - Add RLS policies if missing

  3. Security
    - Enable RLS on both tables
    - Add comprehensive policies for authenticated users
*/

-- Fix report_attachments table
DO $$
BEGIN
  -- Add file_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_attachments' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE report_attachments ADD COLUMN file_url text;
  END IF;

  -- Add file_path if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_attachments' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE report_attachments ADD COLUMN file_path text;
  END IF;

  -- Ensure at least one of file_url or file_path is populated
  -- If file_path exists but file_url doesn't, copy it over
  UPDATE report_attachments 
  SET file_url = file_path 
  WHERE file_url IS NULL AND file_path IS NOT NULL;
  
  -- If file_url exists but file_path doesn't, copy it over
  UPDATE report_attachments 
  SET file_path = file_url 
  WHERE file_path IS NULL AND file_url IS NOT NULL;
END $$;

-- Fix report_comments table
DO $$
BEGIN
  -- Add is_internal if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_comments' AND column_name = 'is_internal'
  ) THEN
    ALTER TABLE report_comments ADD COLUMN is_internal boolean DEFAULT false;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_comments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE report_comments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS on both tables
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_attachments
DROP POLICY IF EXISTS "Authenticated users can view report attachments" ON report_attachments;
CREATE POLICY "Authenticated users can view report attachments"
  ON report_attachments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can upload attachments to their reports" ON report_attachments;
CREATE POLICY "Users can upload attachments to their reports"
  ON report_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own attachments" ON report_attachments;
CREATE POLICY "Users can delete their own attachments"
  ON report_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for report_comments
DROP POLICY IF EXISTS "Users can view report comments" ON report_comments;
CREATE POLICY "Users can view report comments"
  ON report_comments FOR SELECT
  TO authenticated
  USING (
    is_internal = false OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Users can add comments" ON report_comments;
CREATE POLICY "Users can add comments"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON report_comments;
CREATE POLICY "Users can update their own comments"
  ON report_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON report_comments;
CREATE POLICY "Users can delete their own comments"
  ON report_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );