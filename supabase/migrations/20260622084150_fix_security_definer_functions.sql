-- Convert RPC functions from SECURITY DEFINER to SECURITY INVOKER.
-- These functions are called by authenticated users via REST; running them
-- as SECURITY INVOKER means they execute with the caller's privileges,
-- which is safe because RLS policies (USING true) already allow full access
-- to authenticated users. SECURITY DEFINER is no longer needed and was
-- the source of the "can execute SECURITY DEFINER" warnings.
ALTER FUNCTION public.get_account_manager_daily_tasks(uuid)           SECURITY INVOKER;
ALTER FUNCTION public.get_available_team_members_for_assignment(uuid)  SECURITY INVOKER;
ALTER FUNCTION public.get_managed_clients(uuid)                        SECURITY INVOKER;
ALTER FUNCTION public.get_team_daily_progress(uuid, date)              SECURITY INVOKER;
ALTER FUNCTION public.get_team_members(uuid)                           SECURITY INVOKER;

-- handle_new_user and update_all_client_health_scores must stay SECURITY DEFINER
-- (trigger / elevated-privilege operations), but revoke direct REST execution
-- from both anon and authenticated — they should only fire via triggers or
-- internal scheduler, never via /rest/v1/rpc/...
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_all_client_health_scores() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_all_client_health_scores() FROM authenticated;
