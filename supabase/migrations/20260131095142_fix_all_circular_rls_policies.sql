/*
  # Fix All Circular RLS Policy References

  1. Changes
    - Drop all policies that check admin status via profiles table (circular reference)
    - Replace with simpler policies that work without circular dependencies
    - Keep service_role policies for system operations
    
  2. Security
    - Users can manage their own profile
    - Service role can manage all profiles (for triggers/functions)
    - Admin checks will be done at application level, not RLS level
*/

-- Drop problematic admin policies with circular references
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);