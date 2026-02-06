/*
  # Remove hourly_rate column from profiles

  1. Changes
    - Drop `hourly_rate` column from `profiles` table
  
  2. Reason
    - Field is no longer needed in the employee management system
*/

ALTER TABLE profiles DROP COLUMN IF EXISTS hourly_rate;
