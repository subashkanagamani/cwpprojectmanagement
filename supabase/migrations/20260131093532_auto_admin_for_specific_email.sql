/*
  # Auto-assign admin role for specific email
  
  1. Changes
    - Creates a trigger function that automatically assigns admin role to subashkanagamani3107@gmail.com
    - Applies on INSERT to profiles table
    
  2. Security
    - Only affects the specific email address
    - Runs automatically when profile is created
*/

-- Create function to auto-assign admin role for specific email
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the email matches the admin email
  IF NEW.email = 'subashkanagamani3107@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert on profiles
DROP TRIGGER IF EXISTS trigger_auto_assign_admin ON profiles;
CREATE TRIGGER trigger_auto_assign_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_role();
