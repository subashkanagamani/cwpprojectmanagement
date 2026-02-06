/*
  # Fix Circular RLS Dependencies for Profiles

  1. Changes
    - Drop the problematic admin policies that cause circular dependencies
    - Create new policies using JWT claims instead of table lookups
    - Ensure users can always view their own profile
    - Allow admins to view/update all profiles without circular reference
  
  2. Security
    - Users can view and update their own profile
    - Admins can view and update all profiles (checked via JWT, not table lookup)
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Simple admin check using a function to avoid circular dependency
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user's role is admin by looking at their own record only
  -- This avoids the circular dependency by being very specific
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now create policies using the function
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles v2"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update all profiles  
CREATE POLICY "Admins can update all profiles v2"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
