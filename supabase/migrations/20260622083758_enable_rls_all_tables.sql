-- ============================================================
-- Step 1: Enable RLS on every public table that is missing it
-- ============================================================
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_metrics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_approvals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_revisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budgets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_benchmarks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_metrics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_drafts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_metrics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credentials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_health_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_hierarchy         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals_pipeline            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_logs           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2: Add a single "authenticated users can do everything"
--         policy per table. The app handles row-level logic in
--         the UI/query layer; the DB just needs to block anon.
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
    -- Drop any pre-existing blanket policy so this is idempotent
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_full_access" ON public.%I', t
    );
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON public.%I
         FOR ALL TO authenticated
         USING (true)
         WITH CHECK (true)', t
    );
  END LOOP;
END $$;
