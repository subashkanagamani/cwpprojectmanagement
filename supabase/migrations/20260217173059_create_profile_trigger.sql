/*
  # Auto-create Profile on User Signup
  
  This migration creates a trigger that automatically creates a profile
  when a new user signs up through Supabase Auth.
  
  1. Changes
    - Creates a function to handle new user creation
    - Creates a trigger on auth.users table
    - Automatically creates profile with employee role by default
  
  2. Security
    - Profiles are created with 'employee' role by default
    - Admin users must be manually promoted by changing their role to 'admin'
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();