/*
  # Create Feedback Table

  1. New Tables
    - `feedback`
      - `id` (uuid, primary key)
      - `from_user_id` (uuid, references profiles) - Manager/sender
      - `to_user_id` (uuid, references profiles) - Employee/recipient
      - `message` (text) - Feedback message content
      - `read` (boolean) - Whether feedback has been read
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `feedback` table
    - Users can view feedback they sent or received
    - Managers can view feedback sent to their team members
    - Admins can view all feedback

  3. Indexes
    - Add index on from_user_id for efficient queries
    - Add index on to_user_id for efficient queries
*/

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_from_user ON public.feedback(from_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_to_user ON public.feedback(to_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can view feedback they sent
CREATE POLICY "Users can view sent feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

-- Users can view feedback they received
CREATE POLICY "Users can view received feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid());

-- Managers can view feedback sent to their team members
CREATE POLICY "Managers can view team feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.is_manager_of(to_user_id));

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can send feedback (insert)
CREATE POLICY "Users can send feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() AND
    (public.is_admin() OR public.is_manager_of(to_user_id))
  );

-- Users can mark their received feedback as read (update)
CREATE POLICY "Users can mark feedback as read"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feedback_updated_at ON public.feedback;
CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feedback_updated_at();
