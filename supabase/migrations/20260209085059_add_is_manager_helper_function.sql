/*
  # Add is_manager Helper Function

  1. New Function
    - `is_manager()` - Returns true if current user has account_manager role
    
  2. Security
    - SECURITY DEFINER to safely check role
    - Used by other RLS policies and functions
*/

-- Create helper function to check if user is a manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid()
    AND role = 'account_manager'
    AND deleted_at IS NULL
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
