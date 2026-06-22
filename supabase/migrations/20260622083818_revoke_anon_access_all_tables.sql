-- ============================================================
-- Step 3: Revoke anon SELECT from all public tables
--         With RLS enabled, anon has no policies so they can't
--         read data anyway — but revoking the grant removes the
--         table from the GraphQL schema for unauthenticated users.
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','clients','client_services','services',
    'client_assignments','weekly_reports','service_metrics',
    'activity_logs','report_approvals','report_attachments',
    'report_comments','report_revisions','client_budgets',
    'client_portal_users','performance_benchmarks','custom_metrics',
    'report_drafts','activity_metrics','report_templates',
    'employee_tasks','client_notes','time_entries','notifications',
    'budget_alerts','shared_documents','report_feedback','tasks',
    'client_credentials','goals','goal_progress','communications',
    'meeting_notes','calendar_events','resource_allocations',
    'email_templates','client_health_scores','timesheets',
    'internal_comments','saved_filters','user_preferences',
    'dashboard_widgets','notification_preferences','manager_hierarchy',
    'deals','time_off_requests','feedback','deals_pipeline',
    'projects','daily_task_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;
