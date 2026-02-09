/*
  # Add Work Status Field to Daily Task Logs

  1. Changes
    - Add work_status column to track ticket-like status (not_started, in_progress, completed, etc.)
    - Keep existing status field for submission tracking (pending, submitted)
    - Add index for efficient queries
    
  2. Security
    - No RLS changes needed - inherits from existing policies
*/

-- Add work_status column
ALTER TABLE public.daily_task_logs 
ADD COLUMN IF NOT EXISTS work_status text DEFAULT 'not_started' CHECK (work_status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'review'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_work_status ON public.daily_task_logs(work_status);

-- Set default for existing rows
UPDATE public.daily_task_logs 
SET work_status = CASE 
  WHEN status = 'submitted' THEN 'completed'
  ELSE 'not_started'
END
WHERE work_status IS NULL;
