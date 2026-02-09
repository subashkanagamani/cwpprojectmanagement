/*
  # Cleanup and Fix Daily View Functions

  1. Changes
    - Drop old parameterized functions
    - Keep the correct parameterless functions
    
  2. Result
    - Clean function definitions matching UI expectations
*/

-- Drop the OLD parameterized versions (keeping the correct parameterless ones)
DROP FUNCTION IF EXISTS get_account_manager_daily_tasks(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_available_team_members_for_assignment(uuid) CASCADE;

-- The correct parameterless versions already exist and will remain
-- No need to recreate them
