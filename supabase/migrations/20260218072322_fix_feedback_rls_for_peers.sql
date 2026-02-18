/*
  # Fix Feedback RLS Policies for Peer Feedback

  1. Changes
    - Update feedback policies to allow peer-to-peer feedback
    - Previously only allowed downward feedback (manager to employee)
    - Now allows any authenticated user to give feedback to any other user
    - Still maintains proper security (users can't delete others' feedback)

  2. Security
    - Users can view feedback they sent or received
    - Users can create feedback to any other user
    - Users can only update/delete their own sent feedback
    - Admins can manage all feedback
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view feedback they sent" ON feedback;
DROP POLICY IF EXISTS "Users can view feedback they received" ON feedback;
DROP POLICY IF EXISTS "Users can send feedback to their team" ON feedback;
DROP POLICY IF EXISTS "Users can update their own sent feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can manage all feedback" ON feedback;

-- Policy: Users can view feedback they sent
CREATE POLICY "Users can view feedback they sent"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

-- Policy: Users can view feedback they received
CREATE POLICY "Users can view feedback they received"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid());

-- Policy: Authenticated users can send feedback to any other user
CREATE POLICY "Users can send feedback to others"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND to_user_id != auth.uid());

-- Policy: Users can update their own sent feedback
CREATE POLICY "Users can update their own sent feedback"
  ON feedback
  FOR UPDATE
  TO authenticated
  USING (from_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid());

-- Policy: Users can delete their own sent feedback
CREATE POLICY "Users can delete their own sent feedback"
  ON feedback
  FOR DELETE
  TO authenticated
  USING (from_user_id = auth.uid());

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy: Admins can manage all feedback
CREATE POLICY "Admins can manage all feedback"
  ON feedback
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());