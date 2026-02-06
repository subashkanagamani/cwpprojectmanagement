/*
  # Fix auto-profile creation on signup
  
  1. Changes
    - Recreates the handle_new_user function with proper permissions
    - Grants execute permission to service role
    - Ensures function can bypass RLS when creating profiles
    
  2. Security
    - Function runs as postgres user to bypass all RLS
    - Only triggered by auth.users insert, cannot be called directly
*/

-- Drop existing function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Recreate function with proper security context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'employee',
    'active'
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
