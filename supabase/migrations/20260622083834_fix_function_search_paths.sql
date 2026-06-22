-- ============================================================
-- Step 4: Fix mutable search_path on all flagged functions
--         Setting an explicit search_path prevents search_path
--         injection attacks.
-- ============================================================
ALTER FUNCTION public.update_daily_task_logs_updated_at()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_team_members(uuid)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_account_manager_daily_tasks(uuid)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_available_team_members_for_assignment(uuid)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_managed_clients(uuid)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_team_daily_progress(uuid, date)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_all_client_health_scores()
  SET search_path = public, pg_catalog;
