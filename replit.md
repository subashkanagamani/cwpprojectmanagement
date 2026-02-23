# ClientFlow - Client Management Platform

## Overview
Enterprise client management and weekly reporting platform for marketing agencies. Uses Supabase as the backend (client-side SDK) with React frontend and shadcn/ui components.

## Project Architecture
- **Frontend**: React 18 with Tailwind CSS + shadcn/ui, served from `client/src/`
- **Backend**: Express.js with 4 authenticated API endpoints for automation + Vite serving
- **Database**: Supabase (PostgreSQL) - accessed via client-side SDK
- **UI Components**: shadcn/ui (26+ components in `client/src/components/ui/`)
- **Routing**: wouter for client-side routing
- **Font**: Inter (loaded via Google Fonts)

## Key Files
- `server/index.ts` - Express server (serves Vite + API routes)
- `server/routes.ts` - 4 authenticated API endpoints for report automation & notifications
- `server/vite.ts` - Vite dev server integration
- `client/src/App.tsx` - Main React app with routing, GlobalSearch, OfflineBanner
- `client/src/components/AppSidebar.tsx` - Navigation sidebar using shadcn Sidebar
- `client/src/lib/supabase.ts` - Supabase client configuration
- `client/src/contexts/AuthContext.tsx` - Enhanced Supabase auth with session refresh & online/offline detection
- `client/src/contexts/ToastContext.tsx` - Toast notifications: showToast(type, message) or .success()/.error()/.warning()/.info()
- `client/src/lib/database.types.ts` - TypeScript types for Supabase tables
- `client/src/lib/activityLogger.ts` - Audit trail utility (logCreate/logUpdate/logDelete)
- `client/src/hooks/useSecureData.ts` - Role-based data filtering hook
- `client/src/components/GlobalSearch.tsx` - Command palette (Cmd+K / Ctrl+K)
- `client/src/components/NotificationCenter.tsx` - Real-time notification popover
- `client/src/components/ErrorState.tsx` - Error recovery & empty state component
- `client/src/components/ExportDialog.tsx` - Multi-format export with date range filtering
- `client/src/components/PaginationControls.tsx` - Reusable pagination UI
- `client/src/index.css` - Design tokens (CSS variables) and utility classes

## Authentication
- Supabase Auth (email/password)
- Auth context wraps the app with user/profile state
- Enhanced session management: automatic token refresh, session expiry detection
- Online/offline awareness with OfflineBanner component
- Protected routes redirect to login when not authenticated
- Backend API routes verify Supabase JWT tokens for authorization

## Production Features
- **Session Management**: Auto token refresh, expiry detection, online/offline awareness
- **Data Security**: useSecureData hook filters data by role (admin sees all, employees see own)
- **Global Search**: Cmd+K command palette searching clients, employees, reports, tasks
- **Notifications**: Real-time notification center with Supabase realtime subscriptions
- **Error Recovery**: ErrorState component with retry actions, OfflineBanner for connectivity
- **Audit Logging**: Activity logger records create/update/delete actions to activity_logs table
- **Dashboard Customization**: Widget visibility preferences persisted in dashboard_widgets table
- **Data Export**: ExportDialog supports CSV, Excel (XLSX), PDF with date range filtering
- **Pagination**: PaginationControls component for paginated lists
- **Report Automation**: Backend endpoints for overdue report checking and reminder notifications

## Backend API Endpoints (authenticated with Supabase JWT)
- `POST /api/notifications/send` - Send notification to a user
- `POST /api/reports/check-overdue` - Check for missing weekly reports, send reminders
- `POST /api/reports/send-reminders` - Trigger overdue report reminder notifications
- `GET /api/reports/status-summary` - Get current week's report submission summary

## Design System
- **Font**: Inter (Google Fonts)
- **Colors**: Blue primary (HSL 221 83% 53%), soft gray backgrounds
- **Background**: Light gray (HSL 220 20% 97%) for main content, white for cards
- **Border radius**: 0.625rem (10px)
- **Spacing**: Generous - px-6 py-6 lg:px-8 for main content
- **Components**: shadcn/ui with semantic color tokens
- **Dark mode**: Supported via class-based toggle

## Page Structure
- Admin pages in `client/src/components/admin/`
- Employee pages in `client/src/components/employee/`
- Shared UI components in `client/src/components/ui/`
- 90+ components total covering clients, reports, tasks, budget, analytics, etc.

## Running
- `npm run dev` - Start development server on port 5000

## User Preferences
- UI should look clean, spacious, and professionally designed (not AI-generated)
- Keep blue color scheme
- Use Inter font with clean typography and generous whitespace
- Follow reference image style: greeting headers, colored icon containers on stat cards

## UI Consistency Standards (All Pages)
- **Page headers**: `text-2xl font-semibold tracking-tight text-foreground` with `text-sm text-muted-foreground` subtitle
- **Cards**: Always use shadcn `Card` / `CardContent` / `CardHeader` / `CardTitle` - never raw divs with bg-white
- **Buttons**: Always use shadcn `Button` with variants (default, ghost, outline, destructive) - never raw `<button>` with custom styles
- **Colors**: Only semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`) - never `text-gray-*` or `bg-gray-*`
- **Stat cards**: Colored icon containers with `rounded-lg p-2.5 bg-{color}-50 dark:bg-{color}-950/40`
- **Status indicators**: shadcn `Badge` with proper variants - never raw colored spans
- **Forms**: shadcn `Input`, `Select`, `Textarea`, `Label` - never raw HTML form elements
- **Tables**: shadcn `Table` components - never raw `<table>` elements
- **Loading states**: shadcn `Skeleton` component - never spinners or plain text
- **Modals**: shadcn `Dialog` system - never custom Modal components
- **Layout rules**: All `justify-between` flex rows must include `gap-*` AND `flex-wrap`
- **Interactions**: Never add custom `hover:bg-*` to Button or Badge (they handle it automatically)
- **Spacing**: `space-y-8` for page-level sections, `p-5` for card content, `gap-5` for grids
- **Animations**: `animate-fade-up` on major sections with staggered `animationDelay` (100ms increments)
- **Stat cards**: `stat-card-gradient {color}` class with colored top border accents (blue/green/purple/orange)
- **Lists**: `p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group` with ChevronRight hover indicators
- **Empty states**: Centered icon (h-8 w-8 opacity-40) with text-sm text-muted-foreground
- **CSS utilities**: `glass-card`, `stat-card-gradient`, `animate-fade-up`, `hover-elevate`

## Recent Changes
- Migrated from Express+Drizzle to Supabase client-side SDK
- Implemented wouter routing (replaced hash-based navigation)
- Added shadcn/ui component library (27+ components)
- Complete UI consistency pass: updated ALL 35+ admin and employee pages to use shadcn/ui components with semantic color tokens
- Updated design system: Inter font, softer backgrounds, larger radius
- Dashboard uses greeting header ("Good morning, Name") with colored stat cards
- Sidebar includes user avatar footer and cleaner group labels
- Feb 2026: Added 11 production features (session mgmt, security, search, notifications, error recovery, audit, dashboard customization, export, pagination, report automation)
- Feb 2026: Cleaned up server/routes.ts - removed all legacy Express+bcrypt+session routes, replaced with 4 authenticated Supabase-based API endpoints
- Feb 2026: Fixed toast call signatures across all pages (type, message order)
- Feb 2026: Fixed weekly_reports column name (week_start_date) in automation endpoints
- Feb 2026: Added daily_task_logs table for daily metric submissions per assignment
- Feb 2026: Seeded services table with 6 marketing service types (linkedin_outreach, email_outreach, meta_ads, google_ads, seo, social_media)
- Feb 2026: Built employee DailySubmissionsPage - employees log daily service metrics per assignment with save draft / submit
- Feb 2026: Built admin AdminDailySubmissionsPage - admin reviews all daily submissions with search/filter
- Feb 2026: Added DailyTaskLog type to database.types.ts
- Feb 2026: Built unified MyTasksPage combining "My Tasks" + "Daily Submissions" into single tabbed page
- Feb 2026: Added employee-to-employee task request feature (Raise Task Request dialog)
- Feb 2026: Removed separate /daily-submissions route for employees, consolidated into /tasks
- Feb 2026: Sidebar simplified - single "My Tasks" entry for employees instead of two separate items
- Feb 2026: Database schema audit - added migration for 4 missing tables (deals, feedback, time_off_requests, email_logs) and missing columns
- Feb 2026: Fixed weekly_reports queries to use employee_id:client_id:service_id composite key (was using non-existent assignment_id)
- Feb 2026: Updated database.types.ts and shared/schema.ts with complete type definitions for all tables
- Feb 2026: Removed hardcoded encryption key fallback for security
- Feb 2026: Migration file: supabase/migrations/20260222_add_missing_tables_and_columns.sql (must be run in Supabase dashboard)
- Feb 2026: Complete UI revamp - applied modern design system to ALL 45+ admin and employee pages with stat-card-gradient borders, animate-fade-up animations, hover effects, and consistent semantic tokens
- Feb 2026: Built RevenueDashboardPage - client revenue/cost tracking with editable financials stored in custom_fields JSON, div-based bar charts
- Feb 2026: Built PerformanceScoringPage - auto-calculated employee scores from report timeliness (30%), task completion (30%), quality (20%), consistency (20%)
- Feb 2026: Built ReportPDFPage - branded PDF generation with jsPDF + jspdf-autotable, client/date/section selection
- Feb 2026: Enhanced CalendarPage with HTML5 drag-and-drop event rescheduling (preserves time/duration)
- Feb 2026: Enhanced SettingsPage with profile editing (name, phone) and password change
- Feb 2026: Built ClientOnboardingPage - 8-step checklist tracked in clients.custom_fields.onboarding JSON
- Feb 2026: Cleaned up 8 unused/duplicate page components (old Dashboard, Analytics, EmployeeDashboard, etc.)
- Feb 2026: Expanded employee sidebar - added Calendar, Documents, Time Entry, Settings to employee navigation
- Feb 2026: Added email sending endpoint (/api/email/send) with email_logs tracking
- Feb 2026: Added compose email dialog to EmailLogsPage and CommunicationHubPage
- Feb 2026: Added scheduled cron endpoint (/api/cron/check-overdue-reports) for automated report reminders
- Feb 2026: Integrated Replit Object Storage for SharedDocumentsPage file uploads (presigned URL flow)
- Feb 2026: Configured production deployment (autoscale with npm build/start)
- Feb 2026: Added 13 missing table definitions to database.types.ts (activity_logs, calendar_events, communications, email_templates, employee_tasks, goal_progress, meeting_notes, report_approvals, reports, report_templates, resource_allocations, shared_documents, skill_matrix)
- Feb 2026: Added admin role check to /api/credentials/decrypt endpoint for security
- Feb 2026: Added allowedHosts: true to vite.config.ts for Replit iframe proxy compatibility
- Feb 2026: Production build verified - Vite + esbuild bundle succeeds (2.4MB JS, 90KB CSS)
- Feb 2026: Removed 5 duplicate page components (ModernDashboard, ModernClientsPage, BudgetTrackingPage, MyTasksPage, EnhancedEmployeeDashboard)
- Feb 2026: Consolidated routes: EnhancedDashboardPage as admin dashboard, ClientsPage for /clients, BudgetsManagementPage for /budget
- Feb 2026: Added React.lazy code splitting for all 40+ route components - initial bundle reduced from 2.4MB to 640KB (73% reduction)
- Feb 2026: Enhanced ClientPortalView with dashboard KPI cards, greeting header, modern report cards, and detail view
- Feb 2026: Added profile picture display to EmployeesPage, TeamMonitoringPage, and client logos to ClientsPage
- Feb 2026: Added pro-rata billing calculation to RevenueDashboardPage for mid-month client onboarding
- Feb 2026: Added email service status indicator in EmailLogsPage compose dialog (log-only notice)
