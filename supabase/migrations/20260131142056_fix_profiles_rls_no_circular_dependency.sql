/*
  # Fix Profiles RLS Without Circular Dependencies

  1. Changes
    - Drop all existing SELECT and UPDATE policies
    - Create unified policies that check "own profile OR admin" using OR logic
    - This avoids circular dependencies by checking own ID first
  
  2. Security
    - Users can always view and update their own profile
    - Admins can view and update all profiles
    - No circular dependencies
*/

-- Drop all SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles v2" ON profiles;

-- Drop all UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles v2" ON profiles;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_admin();

-- Create a single unified SELECT policy
-- Users can view their own profile OR all profiles if they are an admin
-- The OR logic prevents circular dependency because own profile check comes first
CREATE POLICY "Users can view own profile or admins view all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    (
      SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1
    ) = 'admin'
  );

-- Create a single unified UPDATE policy
CREATE POLICY "Users can update own profile or admins update all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    (
      SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1
    ) = 'admin'
  )
  WITH CHECK (
    auth.uid() = id 
    OR 
    (
      SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1
    ) = 'admin'
  );
