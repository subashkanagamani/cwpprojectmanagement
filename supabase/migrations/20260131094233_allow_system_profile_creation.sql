/*
  # Allow system to create profiles during signup
  
  1. Changes
    - Adds RLS policy to allow profile creation for matching user ID
    - This allows the trigger to create profiles for new users
    - Existing admin-only policy remains for manual profile creation
    
  2. Security
    - Users can only create their own profile (id must match auth.uid())
    - Profile creation happens automatically via trigger
    - Cannot create profiles for other users
*/

-- Add policy to allow users to create their own profile during signup
CREATE POLICY "Users can create own profile on signup"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
