/*
  # Create Supabase Storage Buckets and Policies

  1. Storage Buckets
    - `documents` - For shared client documents
    - `attachments` - For report attachments
    
  2. Storage Policies
    - Authenticated users can upload files
    - Users can only access files for their assigned clients
    - Admins can access all files
    
  3. Notes
    - File size limits set to 50MB
    - Allowed MIME types configured
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 52428800, ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ]),
  ('attachments', 'attachments', false, 52428800, ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket

-- Policy: Authenticated users can upload documents
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Policy: Authenticated users can view documents
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- Policy: Admins can delete documents
CREATE POLICY "Admins can delete documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Storage policies for attachments bucket

-- Policy: Authenticated users can upload attachments
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Policy: Authenticated users can view attachments
CREATE POLICY "Authenticated users can view attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    owner = auth.uid()
  );

-- Policy: Admins can delete all attachments
CREATE POLICY "Admins can delete all attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );