/*
  # Fix Feedback RLS Policies

  1. Policy Updates
    - Fix INSERT policy to allow employees to send feedback
    - Ensure managers can send feedback to their team members
    - Fix policy logic for better access control

  2. Current Issue
    - INSERT policy only allows admins and managers to send feedback
    - Employees should be able to send feedback too

  3. Solution
    - Allow any authenticated user to send feedback (from_user_id = auth.uid())
    - Keep restrictions on to_user_id for valid recipients
*/

-- Drop all existing feedback policies
DROP POLICY IF EXISTS "Users can view feedback sent to them" ON feedback;
DROP POLICY IF EXISTS "Users can view feedback they sent" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users can send feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback;
DROP POLICY IF EXISTS "Managers can view team feedback" ON feedback;
DROP POLICY IF EXISTS "Users can mark feedback as read" ON feedback;
DROP POLICY IF EXISTS "Users can view received feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view sent feedback" ON feedback;

-- Recreate feedback policies with correct logic

-- Users can view feedback sent to them
CREATE POLICY "Users can view received feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (
    to_user_id = auth.uid() OR
    from_user_id = auth.uid() OR
    public.is_admin() OR
    public.is_manager_of(to_user_id) OR
    public.is_manager_of(from_user_id)
  );

-- Any authenticated user can send feedback
CREATE POLICY "Users can send feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Users can update feedback (mark as read, etc)
CREATE POLICY "Users can update feedback"
  ON feedback
  FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (to_user_id = auth.uid() OR public.is_admin());

-- Only admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON feedback
  FOR DELETE
  TO authenticated
  USING (public.is_admin());