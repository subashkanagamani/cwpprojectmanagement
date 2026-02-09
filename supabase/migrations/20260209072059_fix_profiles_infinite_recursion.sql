/*
  # Fix Infinite Recursion in Profiles Table

  The profiles table has RLS policies that query the profiles table itself,
  causing infinite recursion. This migration fixes this by:
  
  1. Creating a security definer function to check admin role (bypasses RLS)
  2. Replacing the problematic policies with ones that use this function
  
  This is a critical fix for application functionality.
*/

-- =====================================================
-- CREATE SECURITY DEFINER FUNCTION TO CHECK ADMIN STATUS
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.is_admin();

-- Create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
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
    AND role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================
-- FIX PROFILES TABLE POLICIES
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users view own or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users update own or admins update all" ON public.profiles;

-- Create new policies using the security definer function
CREATE POLICY "Users view own or admins view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid()) OR 
    public.is_admin()
  );

CREATE POLICY "Users update own or admins update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (select auth.uid()) OR 
    public.is_admin()
  )
  WITH CHECK (
    id = (select auth.uid()) OR 
    public.is_admin()
  );

-- =====================================================
-- FIX OTHER TABLES THAT MAY HAVE SIMILAR ISSUES
-- =====================================================

-- Fix clients table policies
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Fix weekly_reports policies
DROP POLICY IF EXISTS "Admins can view all reports" ON public.weekly_reports;
DROP POLICY IF EXISTS "Admins can create reports for employees" ON public.weekly_reports;
DROP POLICY IF EXISTS "Admins can update all reports" ON public.weekly_reports;

CREATE POLICY "Admins can view all reports"
  ON public.weekly_reports FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create reports for employees"
  ON public.weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all reports"
  ON public.weekly_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Fix client_budgets policies  
DROP POLICY IF EXISTS "Admins can manage budgets" ON public.client_budgets;

CREATE POLICY "Admins can manage budgets"
  ON public.client_budgets FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Fix service_metrics policies
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.service_metrics;

CREATE POLICY "Admins can view all metrics"
  ON public.service_metrics FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Fix activity_logs policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Fix client_assignments policies
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.client_assignments;

CREATE POLICY "Admins can manage assignments"
  ON public.client_assignments FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Fix client_services policies
DROP POLICY IF EXISTS "Admins can manage client services" ON public.client_services;

CREATE POLICY "Admins can manage client services"
  ON public.client_services FOR ALL
  TO authenticated
  USING (public.is_admin());
