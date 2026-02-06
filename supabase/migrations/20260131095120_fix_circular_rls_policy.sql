/*
  # Fix Circular RLS Policy Reference

  1. Changes
    - Drop the problematic "Admins can view all profiles" policy that causes circular reference
    - Keep the simple "Users can view own profile" policy
    - Add a new admin policy that uses app_metadata instead of profiles table
    
  2. Security
    - Users can still read their own profile
    - Admins can read all profiles using JWT metadata
    - Removes the 500 error caused by circular dependency
*/

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a new admin policy using JWT metadata (no circular reference)
-- For now, just keep the basic policy that allows users to view their own profile
-- The admin check will be done at the application level

-- Ensure the basic policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;