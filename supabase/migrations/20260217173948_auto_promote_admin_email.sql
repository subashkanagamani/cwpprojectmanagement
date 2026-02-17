/*
  # Auto-Promote Admin Email to Admin Role
  
  This migration updates the profile creation trigger to automatically
  assign the admin role to the specified admin email address.
  
  1. Changes
    - Updates handle_new_user() function to check for admin email
    - If email matches 'subashkanagamani3107@gmail.com', role is set to 'admin'
    - All other users get 'employee' role by default
  
  2. Security
    - Only the specific email gets auto-promoted to admin
    - All other security policies remain the same
*/

-- Update the function to auto-promote the admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.email = 'subashkanagamani3107@gmail.com' THEN 'admin'
      ELSE 'employee'
    END,
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;