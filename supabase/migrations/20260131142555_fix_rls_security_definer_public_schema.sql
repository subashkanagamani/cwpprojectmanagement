/*
  # Fix RLS Using SECURITY DEFINER Function (Public Schema)

  1. Changes
    - Drop existing SELECT and UPDATE policies on profiles
    - Create a SECURITY DEFINER function in public schema that bypasses RLS
    - Create new policies using this function to avoid circular dependencies
  
  2. Security
    - Users can view and update their own profile
    - Admins can view and update all profiles
    - Function runs with elevated privileges to bypass RLS
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins update all" ON profiles;

-- Create a function that checks if the current user is an admin
-- SECURITY DEFINER makes it run with owner privileges, bypassing RLS
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

-- Create new SELECT policy
CREATE POLICY "Users view own or admins view all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    public.check_is_admin()
  );

-- Create new UPDATE policy
CREATE POLICY "Users update own or admins update all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    public.check_is_admin()
  )
  WITH CHECK (
    auth.uid() = id 
    OR 
    public.check_is_admin()
  );
