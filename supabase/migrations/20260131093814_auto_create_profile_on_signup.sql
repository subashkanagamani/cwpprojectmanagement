/*
  # Auto-create profile on user signup
  
  1. Changes
    - Creates a trigger function that automatically creates a profile when a user signs up
    - Runs with SECURITY DEFINER to bypass RLS policies
    - Sets role to 'employee' by default (admin assignment happens via separate trigger)
    
  2. Security
    - Function runs with elevated privileges to bypass RLS
    - Only creates profile for new auth.users, can't be exploited
*/

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
