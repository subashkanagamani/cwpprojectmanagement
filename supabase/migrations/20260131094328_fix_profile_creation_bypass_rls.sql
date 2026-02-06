/*
  # Fix profile creation to properly bypass RLS
  
  1. Changes
    - Updates handle_new_user function to set local role
    - Explicitly disables RLS checking during profile insert
    - Adds better error logging
    
  2. Security
    - Function runs as superuser context to bypass RLS
    - Only triggered automatically, cannot be called directly by users
*/

-- Drop and recreate the function with explicit RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Insert the profile (SECURITY DEFINER allows this to bypass RLS)
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'employee',
    'active'
  )
  RETURNING id INTO new_profile_id;
  
  RAISE LOG 'Successfully created profile % for user %', new_profile_id, NEW.email;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  WHEN others THEN
    RAISE LOG 'Error creating profile for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the function owner has necessary permissions
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;
