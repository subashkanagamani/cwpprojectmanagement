/*
  # Allow service role to create profiles
  
  1. Changes
    - Adds RLS policy allowing service_role to insert profiles
    - This ensures the trigger function can create profiles
    
  2. Security
    - Only service_role can use this policy
    - Service role is system-level, not accessible to end users
*/

-- Add policy for service role to insert profiles (for trigger function)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also update the existing policy to make it clearer
DROP POLICY IF EXISTS "Users can create own profile on signup" ON profiles;

CREATE POLICY "Users can create own profile on signup"
  ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = id);
