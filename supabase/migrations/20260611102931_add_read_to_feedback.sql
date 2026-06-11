-- Add 'read' column to feedback table (used by FeedbackPage)
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;