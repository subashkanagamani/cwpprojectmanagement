-- ============================================================
-- Step 5: Revoke anon EXECUTE from SECURITY DEFINER functions
--         that should only be callable by authenticated users.
--         handle_new_user is an auth trigger — no one should
--         call it via REST.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_account_manager_daily_tasks(uuid)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_available_team_members_for_assignment(uuid)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_managed_clients(uuid)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_team_daily_progress(uuid, date)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_team_members(uuid)                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                                 FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_all_client_health_scores()                 FROM anon;
