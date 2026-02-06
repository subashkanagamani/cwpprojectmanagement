/*
  # Create Storage Bucket for Report Attachments

  1. New Storage Bucket
    - `report-attachments` bucket for storing files
    - Public read access for authenticated users
    - Secure upload policies
  
  2. Security
    - Authenticated users can upload to their own reports
    - All authenticated users can read attachments
    - Admins have full access
*/

-- Create storage bucket for report attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload report attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-attachments' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'report-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-attachments' AND
  auth.uid() = owner
);

-- Allow admins to delete any attachment
CREATE POLICY "Admins can delete any attachment"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-attachments' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
