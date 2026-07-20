# ClientFlow — Complete Product Guide

> Enterprise client management and weekly reporting platform for marketing agencies. Built with React, Vite, TypeScript, Supabase, and Tailwind CSS.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Authentication](#2-user-roles--authentication)
3. [Technology Stack & Architecture](#3-technology-stack--architecture)
4. [Database Schema (48 Tables)](#4-database-schema-48-tables)
5. [Admin Features](#5-admin-features)
6. [Employee Features](#6-employee-features)
7. [Client Portal Features](#7-client-portal-features)
8. [Cross-Cutting Features](#8-cross-cutting-features)
9. [End-to-End Workflows](#9-end-to-end-workflows)

---

## 1. Product Overview

ClientFlow is an internal operations platform for marketing agencies that deliver recurring services (LinkedIn outreach, SEO, Google Ads, Meta Ads, social media management, email outreach) to multiple clients simultaneously. The product solves three core problems:

1. **Client management** — Track every client's status, health, team assignments, budget, credentials, and onboarding progress in one place.
2. **Weekly reporting** — Employees submit structured, service-specific performance reports each week. Admins review, approve, and consolidate them. Clients view approved reports through a dedicated portal.
3. **Team operations** — Manage employees, workload, tasks, goals, time tracking, timesheets, time-off, performance scoring, feedback, and calendar events.

### The Three User Classes

| Class | How they log in | What they see |
|-------|-----------------|---------------|
| **Admin** | `profiles.role = 'admin'` | Full sidebar with 36 navigation items across 7 sections. Full CRUD on all entities. |
| **Employee** | `profiles.role = 'employee'` | Limited sidebar with 12 navigation items across 2 sections. CRUD scoped to their own assignments. |
| **Client (Portal User)** | `client_portal_users` table, `is_active = true` | Standalone portal (no sidebar). Read-only access to their own approved reports + ability to leave feedback. |

---

## 2. User Roles & Authentication

### Authentication Flow

The app uses **Supabase Auth** with email/password (no magic links, no social providers). The `AuthContext` manages the entire auth lifecycle:

#### Session Initialization
- Uses `supabase.auth.onAuthStateChange()` exclusively (deliberately avoids `getSession()` which can hang on stale tokens).
- Handles 5 events: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`.
- **3-second safety timeout**: If `INITIAL_SESSION` never fires, `loading` is forced to `false` so the UI doesn't hang.

#### Role Resolution (`loadProfile`)
When a user authenticates, the system determines their role in this order:
1. Query `profiles` by `user_id`. If found → internal staff (admin or employee based on `role` field). `isPortalUser = false`.
2. Else query `client_portal_users` where `user_id = id` AND `is_active = true`. If found → external client. `isPortalUser = true`, `profile = null`.
3. If neither found → profile loading fails, user sees "Setting up your workspace…" screen with a retry button.
4. On auth-class errors (401/403, JWT expired) → `sessionExpired = true`, user is automatically signed out.

#### Auth Error Detection
Triggers session expiry when: HTTP 401/403, OR error message contains `invalid claim`, `expired`, `invalid signature`, `invalid token`, `jwt`, `unauthorized`, or `session`.

#### Online/Offline Handling
- Listens to `window` `online`/`offline` events.
- On reconnect → resets `sessionExpired` flag.

### Auth Operations

| Operation | Method | Notes |
|-----------|--------|-------|
| **Sign In** | `signInWithPassword(email, password)` | Sets loading=true, clears sessionExpired on success |
| **Sign Up** | `supabase.auth.signUp(email, password)` | No metadata passed. A database trigger (`handle_new_user`) auto-creates a `profiles` row with `role = 'employee'`. |
| **Sign Out** | `supabase.auth.signOut()` | Clears all local state (user, profile, isPortalUser). Graceful even on failure. |
| **Forgot Password** | `resetPasswordForEmail(email)` | Sends reset email with `redirectTo: /reset-password` |
| **Reset Password** | `supabase.auth.updateUser({ password })` | Reached via email link. Auto-redirects to `/dashboard` after 2 seconds on success. |
| **Refresh Session** | `supabase.auth.refreshSession()` | Manual refresh; signs out on auth error |

### Auth UI Components

#### LoginPage
- Dual-mode: toggles between Sign In and Sign Up.
- Split-screen marketing layout: left panel with blue gradient, feature grid (Real-time Analytics, Team Management, Client Health Scoring, Automated Reports); right panel with the form.
- Email validation always; password strength validation on sign-up (8+ chars, uppercase, number, special char).
- Password strength meter (score 0-6 with colored bar) on sign-up.
- Show/hide password toggle.
- "Forgot password" link → `/forgot-password` (sign-in mode only).
- Uses `formatError()` to display user-friendly error messages.

#### ForgotPasswordPage
- Single email field. Calls `resetPassword(email)`. Shows success screen with "Check your email" on success.

#### ResetPasswordPage
- Two fields (new password + confirm), both with show/hide toggles.
- Password strength meter + requirements hint box.
- On success → "Password updated" screen, then auto-redirects to `/dashboard` after 2 seconds.

### Role-Based Routing

The `AppContent` component determines routing in this order (early returns):
1. `/forgot-password` → `ForgotPasswordPage` (bypasses sidebar)
2. `/reset-password` → `ResetPasswordPage` (bypasses sidebar)
3. `loading` → full-screen spinner
4. `!user` → `LoginPage`
5. `isPortalUser` → `ClientPortalView` (no sidebar, separate portal experience)
6. `!profile` → "Setting up your workspace…" retry screen
7. Otherwise → render sidebar + either `AdminRoutes` or `EmployeeRoutes` based on `profile.role === 'admin'`

### New User Signup → Profile Creation

When a new user signs up, a Postgres trigger (`on_auth_user_created` → `handle_new_user()`) automatically creates a `profiles` row:
- `user_id` = new auth user's ID
- `email` = new user's email
- `full_name` = `raw_user_meta_data.full_name` or email prefix (before @)
- `role` = `raw_user_meta_data.role` or `'employee'` (default)
- Exception handling: if profile creation fails, it logs the error but still returns NEW (doesn't block signup)

---

## 3. Technology Stack & Architecture

### Frontend
- **React 18** with TypeScript, **Vite 5** as build tool
- **wouter** for client-side routing (Switch/Route, lazy-loaded components with Suspense)
- **Tailwind CSS 3** + **tailwindcss-animate** for styling
- **Radix UI** primitives (avatar, checkbox, dialog, dropdown-menu, label, popover, progress, scroll-area, select, separator, slot, switch, tabs, toast, tooltip)
- **lucide-react** for icons
- **Recharts 3** for data visualization (area, bar, pie/donut charts)
- **jsPDF** + **jspdf-autotable** for PDF generation
- **xlsx** for Excel import/export
- **date-fns** for date manipulation

### Backend / Data
- **Supabase** (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **Drizzle ORM** for schema definition (`shared/schema.ts`)
- Express server (`server/index.ts`) for API endpoints (employee creation, credential encryption/decryption, portal user creation, email sending)
- **Replit Object Storage** integration for file uploads
- **Resend** for transactional emails
- **bcryptjs** for server-side password hashing

### State Management
- **React Context** for auth (`AuthContext`), theme (`ThemeContext`), and toasts (`ToastContext`)
- **Local component state** with `useState`/`useEffect` — no Redux or global state library
- All data fetched directly from Supabase via the client, except server-side operations (employee/portal/credential creation, email sending)

### Data Patterns
- **Soft deletes**: `deleted_at` timestamp on `profiles`, `clients`, `client_assignments`, `weekly_reports`, `tasks`, `goals`
- **Hard deletes**: `deals`, `calendar_events`, `client_credentials`, `email_templates`, `shared_documents`, `client_budgets`
- **JSONB columns** for flexible data: `custom_fields` (clients, profiles), `metric_data` (service_metrics), `template_data` (report_templates), `draft_data` (report_drafts), `preferences` (user_preferences), `config` (dashboard_widgets)
- **Auto-save**: Report drafts auto-save every 30 seconds during report submission
- **Realtime**: Notifications use Supabase Realtime subscriptions to push new notifications with toast alerts

### Server-Side API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/employees/create` | POST | Creates auth user + profile (server-side, uses service role key) |
| `/api/portal-users/create` | POST | Creates client portal user (auth account + portal_users row) |
| `/api/credentials/create` | POST | Stores encrypted client credential (server-side bcrypt encryption) |
| `/api/credentials/update` | PUT | Updates encrypted credential |
| `/api/credentials/decrypt` | POST | Decrypts and returns credential password |
| `/api/email/send` | POST | Sends email via Resend, logs to `email_logs` |

### Supabase RPC Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: auto-creates profile on auth user creation |
| `get_team_members()` | Returns team members for a manager |
| `get_managed_clients()` | Returns clients managed by current user (for account managers) |
| `get_team_daily_progress(p_log_date)` | Returns per-employee/per-service daily progress |
| `get_account_manager_daily_tasks()` | Returns daily tasks for account manager's team |
| `get_available_team_members_for_assignment()` | Returns team members available for task assignment |
| `update_all_client_health_scores()` | Recomputes all client health scores |

---

## 4. Database Schema (48 Tables)

### Core Entities

#### profiles
Internal staff (admins and employees). Linked 1:1 to `auth.users`.
- `id` (uuid PK), `user_id` (uuid unique, → auth.users), `email` (text unique), `full_name` (text), `role` ('admin' | 'employee'), `status` ('active' | 'inactive'), `skills` (jsonb array), `max_capacity` (int, default 5), `phone` (text), `manager_id` (uuid → profiles), `custom_fields` (jsonb: `{profile_image, logo, financials}`), `deleted_at`, `created_at`, `updated_at`

#### clients
Client accounts managed by the agency.
- `id` (uuid PK), `name`, `industry`, `status` ('active' | 'paused' | 'completed'), `start_date` (date), `notes`, `contact_name`, `contact_email`, `contact_phone`, `website`, `priority` ('low' | 'medium' | 'high' | 'critical'), `health_status` ('healthy' | 'needs_attention' | 'at_risk'), `health_score` (numeric, 0-100, default 100), `last_activity_date` (timestamp), `custom_fields` (jsonb: `{logo, onboarding, financials}`), `report_due_day` (int, default 5), `weekly_meeting_day` (int), `meeting_time` (text, default '10:00'), `meeting_reminder_hours` (int, default 24), `deleted_at`, `created_at`, `updated_at`

#### services
Service types offered by the agency.
- `id` (uuid PK), `name` (text unique), `slug` (text unique), `description`, `is_active` (bool, default true), `created_at`
- Seeded services include: LinkedIn Outreach, SEO, Google Ads, Meta Ads, Facebook Ads, Instagram Ads, Social Media Management, Email Outreach, Account Manager

#### client_assignments
Maps employees to clients for specific services. An employee can be assigned to the same client for multiple services.
- `id` (uuid PK), `client_id` (→ clients), `employee_id` (→ profiles), `service_id` (→ services), `is_active` (bool, default true), `is_account_manager` (bool, default false), `deleted_at`, `created_at`

#### client_portal_users
External client users who can log into the client portal.
- `id` (uuid PK), `client_id` (→ clients), `email` (text unique), `full_name` (text), `auth_user_id` (uuid → auth.users), `is_active` (bool, default true), `last_login_at` (timestamp), `created_at`, `updated_at`

### Reporting

#### weekly_reports
The central reporting entity. Employees submit one per client/service/week.
- `id` (uuid PK), `client_id`, `employee_id`, `service_id`, `week_start_date` (date), `work_summary` (text), `key_wins` (text), `challenges` (text), `next_week_plan` (text), `status` (text), `approval_status` ('draft' | 'submitted' | 'approved' | 'revision_requested', default 'draft'), `is_draft` (bool, default false), `last_auto_saved` (timestamp), `report_template_id` (uuid), `submitted_at` (timestamp), `deleted_at`, `created_at`, `updated_at`

#### service_metrics
Flexible JSONB metrics stored per report (e.g., impressions, clicks, ROAS, connections sent).
- `id` (uuid PK), `weekly_report_id` (→ weekly_reports, cascade), `metric_data` (jsonb, default {}), `created_at`

#### activity_metrics
LinkedIn-specific outreach metrics stored per report.
- `id` (uuid PK), `report_id` (→ weekly_reports), `metric_type` (default 'linkedin_outreach'), `connections_sent`, `connections_accepted`, `responses_received`, `positive_responses`, `meetings_booked` (all int, default 0), `meeting_dates` (jsonb array), `custom_metrics` (jsonb), `metric_name`, `metric_value` (numeric), `recorded_at` (timestamp)

#### report_approvals
Approval workflow tracking.
- `id` (uuid PK), `report_id` (→ weekly_reports, unique), `status` ('draft' | 'submitted' | 'approved' | 'revision_requested'), `approver_id` (uuid), `approved_at` (timestamp), `feedback` (text), `created_at`, `updated_at`

#### report_attachments
File uploads attached to reports.
- `id` (uuid PK), `report_id` (→ weekly_reports), `file_name`, `file_path`, `file_url`, `file_size` (int), `file_type`, `uploaded_by` (uuid), `created_at`

#### report_comments
Comments on reports.
- `id` (uuid PK), `report_id`, `user_id`, `comment` (text), `is_internal` (bool, default false), `created_at`, `updated_at`

#### report_revisions
Version history for reports.
- `id` (uuid PK), `report_id`, `version` (int), `data` (jsonb), `changed_by` (uuid), `created_at`

#### report_drafts
Legacy draft storage (auto-save).
- `id` (uuid PK), `employee_id`, `client_id`, `service_id`, `week_start_date` (date), `draft_data` (jsonb), `created_at`, `updated_at`

#### report_templates
Reusable report templates.
- `id` (uuid PK), `name`, `description`, `template_data` (jsonb), `created_by` (uuid), `is_default` (bool), `is_active` (bool), `created_at`, `updated_at`

#### report_feedback
Feedback from client portal users on approved reports.
- `id` (uuid PK), `report_id` (→ weekly_reports), `portal_user_id` (→ client_portal_users), `rating` (int), `feedback` (text), `created_at`

### Tasks & Goals

#### tasks
Admin-assigned tasks.
- `id` (uuid PK), `title`, `description`, `assigned_to` (→ profiles), `created_by` (uuid), `client_id` (uuid), `priority` ('low' | 'medium' | 'high'), `due_date` (date, required), `status` ('pending' | 'in_progress' | 'completed'), `completed_at` (timestamp), `remarks` (text), `deleted_at`, `created_at`, `updated_at`

#### employee_tasks
Legacy employee task table (separate from `tasks`).
- `id` (uuid PK), `employee_id`, `title`, `description`, `due_date`, `priority`, `status`, `created_by`, `completed_at`, `created_at`

#### goals
Client objectives with measurable targets.
- `id` (uuid PK), `client_id`, `service_id`, `title`, `description`, `target_value` (numeric), `current_value` (numeric, default 0), `unit` (text), `start_date`, `target_date`, `status` ('active' | 'completed' | 'on_hold' | 'cancelled'), `priority` ('low' | 'medium' | 'high'), `created_by`, `created_at`, `updated_at`

#### goal_progress
Progress history for goals.
- `id` (uuid PK), `goal_id` (→ goals), `value` (numeric), `notes` (text), `recorded_by` (uuid), `recorded_at` (timestamp)

#### calendar_events
Calendar events with client association.
- `id` (uuid PK), `title`, `description`, `event_type` ('meeting' | 'deadline' | 'milestone' | 'reminder'), `start_time`, `end_time`, `client_id`, `attendees` (jsonb), `location`, `is_recurring` (bool), `recurrence_rule` (text), `created_by`, `created_at`, `updated_at`

### Sales & Finance

#### deals
Sales pipeline deals.
- `id` (uuid PK), `client_id`, `deal_name`, `deal_value` (numeric), `stage` ('lead' | 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'), `probability` (int 0-100), `expected_close_date` (date), `owner_id` (uuid), `notes`, `status` ('active' | 'won' | 'lost' | 'on_hold'), `created_at`, `updated_at`

#### client_budgets
Budget tracking per client/service.
- `id` (uuid PK), `client_id`, `service_id`, `monthly_budget` (numeric), `actual_spending` (numeric, default 0), `budget_utilization` (numeric 0-100, default 0), `currency` ('USD' | 'EUR' | 'GBP' | 'INR', default 'USD'), `start_date`, `end_date`, `notes`, `created_at`, `updated_at`

#### budget_alerts
Automated budget alerts.
- `id` (uuid PK), `client_budget_id` (→ client_budgets, cascade), `threshold_percentage` (int), `alert_sent` (bool), `alert_sent_at` (timestamp), `created_at`

#### revenue
Revenue data is stored in `clients.custom_fields.financials` JSON: `{monthly_revenue, monthly_cost, payment_history: [{month, due, paid, paid_date}]}`. Pro-rata billing calculated from `clients.start_date`.

### Time Tracking

#### time_entries
Individual time logs.
- `id` (uuid PK), `employee_id`, `client_id`, `service_id`, `hours` (numeric), `date` (date), `description`, `is_billable` (bool, default true), `hourly_rate` (numeric), `created_at`

#### timesheets
Weekly timesheet summaries with approval workflow.
- `id` (uuid PK), `employee_id`, `week_start` (date), `status` ('draft' | 'submitted' | 'approved' | 'rejected'), `total_hours` (numeric), `submitted_at`, `approved_at`, `approved_by` (uuid), `created_at`, `updated_at`

#### time_off_requests
Leave requests with approval workflow.
- `id` (uuid PK), `employee_id`, `type` ('vacation' | 'sick' | 'personal' | 'other'), `start_date`, `end_date`, `reason`, `status` ('pending' | 'approved' | 'rejected'), `approved_by` (uuid), `approved_at`, `created_at`, `updated_at`

#### daily_task_logs
Daily work logs per assignment (used by account manager daily view and team progress tracker).
- `id` (uuid PK), `assignment_id` (→ client_assignments), `employee_id`, `client_id`, `service_id`, `log_date` (date), `metrics` (jsonb), `notes`, `status` ('pending' | 'submitted'), `work_status` ('not_started' | 'in_progress' | 'completed' | 'on_hold' | 'in_review'), `submitted_at`, `created_at`, `updated_at`

### Communication & Documents

#### communications
Log of all client interactions.
- `id` (uuid PK), `client_id`, `type` ('email' | 'call' | 'meeting' | 'message'), `direction` ('inbound' | 'outbound'), `subject`, `summary`, `content`, `created_by`, `created_at`

#### meeting_notes
Structured meeting records.
- `id` (uuid PK), `client_id`, `title`, `date` (timestamp), `attendees` (jsonb array), `agenda`, `notes`, `action_items` (jsonb array: `[{task, assignee, due_date}]`), `next_meeting` (timestamp), `created_by`, `created_at`, `updated_at`

#### email_templates
Reusable email templates.
- `id` (uuid PK), `name`, `subject`, `body`, `template_type` ('report_delivery' | 'deadline_reminder' | 'welcome' | 'status_update' | 'custom'), `variables` (jsonb), `created_by`, `created_at`, `updated_at`

#### email_logs
Audit log of all sent emails.
- `id` (uuid PK), `recipient_email`, `subject`, `body`, `template_used`, `status` ('sent' | 'opened' | 'clicked' | 'failed'), `sent_by` (uuid), `client_id`, `sent_at`, `created_at`

#### shared_documents
Client document repository.
- `id` (uuid PK), `client_id`, `file_name`, `file_url`, `file_type`, `file_size` (int), `uploaded_by` (uuid), `description`, `permissions` ('view' | 'download', default 'view'), `created_at`

#### client_credentials
Encrypted client tool credentials.
- `id` (uuid PK), `client_id`, `tool_name`, `username`, `encrypted_password` (text, server-side encrypted), `notes`, `created_by`, `created_at`, `updated_at`

#### client_notes
Notes on clients by employees.
- `id` (uuid PK), `client_id`, `employee_id`, `note` (text), `created_at`, `updated_at`

### HR & Performance

#### feedback
Internal peer feedback messages.
- `id` (uuid PK), `from_user_id` (→ profiles), `to_user_id` (→ profiles), `message` (text), `read` (bool, default false), `created_at`

#### performance_benchmarks
Industry benchmark data for metric comparison.
- `id` (uuid PK), `service_id`, `industry`, `metric_name`, `benchmark_value` (numeric), `period` ('monthly' | 'quarterly' | 'yearly'), `created_at`, `updated_at`

#### custom_metrics
Custom KPI definitions per service.
- `id` (uuid PK), `service_id`, `metric_name`, `metric_type` ('number' | 'currency' | 'percentage'), `description`, `is_active` (bool), `created_at`

#### resource_allocations
Employee capacity allocations.
- `id` (uuid PK), `employee_id`, `client_id`, `service_id`, `allocated_hours` (numeric), `week_start` (date), `created_at`, `updated_at`

#### skill_matrix
Employee skills tracking.
- `id` (uuid PK), `employee_id`, `skill_name`, `proficiency_level`, `notes`, `assessed_by`, `assessed_at`, `created_at`

### System & Preferences

#### notifications
User notifications.
- `id` (uuid PK), `user_id`, `title`, `message`, `type` ('info' | 'success' | 'warning' | 'error'), `is_read` (bool, default false), `link` (text), `created_at`

#### activity_logs
System audit trail.
- `id` (uuid PK), `user_id`, `action` ('INSERT' | 'UPDATE' | 'DELETE'), `entity_type`, `entity_id` (uuid), `details` (jsonb), `ip_address`, `created_at`

#### user_preferences
Per-user settings.
- `user_id` (uuid PK), `theme` ('light' | 'dark'), `language` ('en' | 'es' | 'fr' | 'de'), `timezone`, `date_format` ('MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'), `time_format` ('12h' | '24h'), `items_per_page` (int), `default_view` ('list' | 'grid'), `preferences` (jsonb), `created_at`, `updated_at`

#### dashboard_widgets
Per-user dashboard widget configuration.
- `id` (uuid PK), `user_id`, `widget_type`, `position` (int), `size` ('small' | 'medium' | 'large'), `config` (jsonb), `is_visible` (bool), `created_at`, `updated_at`
- Widget types: active_clients, pending_reports, revenue_chart, team_utilization, recent_activity, upcoming_deadlines, client_health, goal_progress, time_tracking, budget_alerts

#### notification_preferences
Per-user notification channel preferences.
- `user_id` (uuid PK), `email_enabled` (bool), `email_digest` ('daily' | 'weekly' | 'monthly'), `browser_enabled` (bool), `deadline_reminders` (bool), `mention_notifications` (bool), `approval_notifications` (bool), `created_at`, `updated_at`

#### saved_filters
User-saved filter presets.
- `id` (uuid PK), `user_id`, `filter_name`, `page`, `filter_data` (jsonb), `is_shared` (bool), `created_at`

#### internal_comments
Comments on any entity (polymorphic).
- `id` (uuid PK), `entity_type`, `entity_id` (uuid), `user_id`, `comment`, `created_at`, `updated_at`

#### client_health_scores
Calculated health scores per client.
- `id` (uuid PK), `client_id` (→ clients, unique), `score` (numeric 0-100), `factors` (jsonb), `calculated_at` (timestamp), `next_review_date` (date)

#### client_services
Maps which services are enabled for each client.
- `id` (uuid PK), `client_id` (→ clients, cascade), `service_id` (→ services, cascade), `created_at`

---

## 5. Admin Features

Admins see a sidebar with 36 navigation items across 7 sections. Below is every page and what it does.

### 5.1 Overview Section

#### Dashboard (`/dashboard` — EnhancedDashboardPage)
Agency-wide overview showing:
- **4 stat cards**: Total Clients (active count), Team Members (active count), Weekly Reports (submitted/pending this week), Budget Used (% and dollar totals)
- **Client Health distribution bar**: healthy / needs attention / at risk counts
- **Team Workload list**: Top 5 employees by assignment count with capacity progress bars
- **Alert banner** when clients need attention
- **Priority Clients grid**: Critical/high priority clients (up to 6)
- **Recent Activity log**: Last 8 activity entries
- **Recent Clients list**: 5 most recently added
- **Quick Actions shortcuts**: Reports, Assignments, Add Client, Analytics
- Supports per-user widget visibility preferences (loaded from `dashboard_widgets` table)

#### Projects (`/projects` — ModernProjectsPage)
Kanban board + list view for project tasks:
- **Kanban columns**: To Do (pending), In Progress, Done (completed)
- **Drag-and-drop** between status columns (sets `completed_at` when moved to done)
- **List view table**: Title, Client, Assignee, Priority, Status, Due Date, Actions
- **Create task**: title, description, priority, status, assignee, client, due date
- **Edit task** via dialog
- **Soft delete** tasks (sets `deleted_at`)
- Search and client filtering
- Overdue date highlighting

#### Analytics (`/analytics` — EnhancedAnalyticsPage)
Read-only analytics dashboard with time range selector (7/30/90 days):
- **4 KPI cards**: Active Clients, Report Submission Rate % (with period-over-period change), Team Members, Task Completion %
- **Charts** (Recharts):
  - Report Submissions Over Time — stacked area chart (submitted vs. draft) over 8 weeks
  - Client Health — donut/pie chart (Healthy / Needs Attention / At Risk)
  - Budget Utilization — progress bar (spent vs. budget)
  - Service Workload — horizontal bar chart (assignments & reports per service)
  - Employee Workload — horizontal bar chart (top 10 employees)
  - Top Performers — ranked list (score = submitted×10 + total×5) with on-time % color coding
  - Clients Needing Attention — list of at-risk clients sorted by health score

### 5.2 Clients Section

#### Clients (`/clients` — ClientsPage)
Full client management:
- **4 stat cards**: Total Clients, Active Clients, Needs Attention, Monthly Budget
- **Client table**: Avatar+name+industry, contact, status badge, priority badge, health indicator, team count (clickable), budget, actions
- **Status filter tabs** + search + pagination
- **Add/Edit client modal**: name, industry, status, priority, health, start date, contact info (name, email, phone, website), meeting schedule (day, time, reminder hours, report due day), services enabled (checkboxes), team assignments (employee + service + account manager flag)
- **Soft delete** clients
- **Assignment modal**: Add team members to a client with service selection

#### Client Detail (`/clients/:id` — ClientDetailPage)
Single client profile:
- **Header**: Logo (uploadable, stored in `custom_fields.logo`), name, status, health, industry, start date
- **4 stat cards**: Team Size, Total Reports, On Track, Needs Attention
- **Contact information card**: name, email, phone, website
- **Notes card**: Client notes
- **Assigned Team**: Grouped by employee with service badges (removable via X button)
- **Work Reports table**: Date, Employee, Service, Status, Summary
- **Edit client modal**: Full client edit (name, industry, status, priority, health, contact, notes)
- **Upload client logo**: Stored in `custom_fields.logo`
- **Assign employee** to a service
- **Remove individual assignment** (hard delete from `client_assignments`)

#### Client Health (`/client-health` — ClientHealthDashboard)
Health monitoring dashboard:
- **Overall Health ring**: Average health score /100 across active clients (custom SVG ring)
- **Health Breakdown card**: Counts + percentage bars for Healthy / Needs Attention / High Risk
- **At-risk alert banner** with count + "View" shortcut to filter
- **"Refresh Scores" button**: Calls RPC `update_all_client_health_scores` to recompute all scores
- **Filter buttons**: All / Healthy / Needs Attention / High Risk
- **Per-client cards**: Name, industry, health score, mini health bar, status badge, last-activity (relative days), contact name, assignment count
- Flags "Overdue for check-in" if ≥7 days since last activity

#### Deals (`/deals` — DealsPage)
Sales pipeline management:
- **4 stat cards**: Active Deals count, Pipeline Value ($), Weighted Value ($), Won Deals ($)
- **Pipeline list**: deal name, stage badge, status badge, client, value, probability %, owner, expected close date, notes
- **Filters**: status (all/active/won/lost/on_hold) and stage (prospecting/qualified/proposal/negotiation/closed_won/closed_lost)
- **Create deal**: name, client, value, probability, stage, status, expected close date, owner, notes
- **Edit deal**
- **Hard delete** deal

#### Credentials (`/credentials` — ClientCredentialsPage)
Secure client credential management:
- **Credentials grouped by client** (card per client)
- **Add credential** (admin only): Client, Tool/Service Name, Username, Password, Notes → encrypted server-side via `/api/credentials/create`
- **Edit credential** (admin only): Tool Name, Username, New Password (blank = keep existing), Notes → `/api/credentials/update`
- **Delete credential** (admin only, with confirmation)
- **Toggle password visibility**: Decrypts via `/api/credentials/decrypt` API
- **Employees**: Restricted to credentials of clients they're assigned to
- Security notice displayed

#### Onboarding (`/onboarding` — ClientOnboardingPage)
Tracks onboarding progress for new/incomplete clients via an **8-step checklist**:
1. `initial_meeting` 2. `contract_signed` 3. `services_configured` 4. `team_assigned` 5. `access_credentials` 6. `report_template` 7. `kickoff_call` 8. `portal_access`
- **4 stat cards**: Total Onboarding, In Progress, Completed, Avg Completion %
- **Search** clients by name + **filter**: All / In Progress / Completed
- **Toggle each step checkbox** per client (updates `custom_fields.onboarding` on the client record)
- Auto-sets `started_at` when first step checked, `completed_at` when all 8 checked
- Only loads clients created within last 90 days OR with incomplete onboarding

### 5.3 Team Section

#### Employees (`/employees` — EmployeesPage)
Team member management:
- **4 stat cards**: Total Team Members, Active Members, High Workload (75%+), Avg Capacity Used
- **Employee table**: Avatar+name+email, skills badges, role badge, workload bar (assignments/max capacity), assignments count, status toggle, actions (view/edit/delete)
- **Add/Edit modal**: name, email, phone, password (create only), role, status, max capacity, manager, skills (checkboxes from services)
- **Create employee** via `/api/employees/create` (creates auth user + profile server-side)
- **Edit employee**: Direct `profiles` update
- **Toggle active/inactive status**
- **Soft delete** (blocked if has assignments)
- **Assignment modal**: Current assignments + form to assign new client+service (disabled at capacity)

#### Employee Detail (`/employees/:id` — EmployeeDetailPage)
Read-only employee profile:
- **Header**: Avatar, name, status, role, email, member-since date
- **4 stat cards**: Active Assignments, Hours This Month, Billable Hours, Capacity Used
- **Profile Information card**: email, phone, manager, joined date, capacity progress bar, skills badges
- **Client Assignments table**: Client, Service, Status, Hours
- **Time Entries This Month table**: Date, Client, Service, Description, Hours, Billable badge

#### Workload (`/workload` — EmployeeWorkloadDashboard)
Capacity utilization dashboard:
- **4 summary cards**: Team Members, High/Overloaded count, Total Assignments, Active Clients
- **Service Capacity Rules card**: Lists each service and its max-client limit (e.g., LinkedIn Outreach=5, SEO=3, Social Media=4, Account Manager=6)
- **Search** (name, email, client, service) + **sort** (Workload / Clients / Name)
- **Expand All / Collapse All** toggle
- **Per-employee cards**: Avatar, name, email, workload badge (Low/Medium/High/Overloaded), clients count, assignments count, capacity %
- **Service Utilization bars**: clientCount/maxClients per service with tooltips listing client names; over-limit shown in red
- **Available Capacity chips**: Remaining slots per service when expanded
- **Capacity rules** (hardcoded `SERVICE_CAPACITY` map): LinkedIn Outreach=5, SEO=3, Social Media=4, Account Manager=6, etc.

#### Daily View (`/daily-view` — EnhancedDailyViewPage)
Comprehensive daily activity dashboard:
- **Date picker** (select any date)
- **4 stat cards**: Activities (total + tasks/reports breakdown), Completed (with completion %), Active Team (of total), Active Clients
- **Three tabs**:
  - **Activity Feed**: Timeline of tasks + reports (icon, title, status, priority, description, employee, client, time)
  - **Team Status**: List of all employees with avatar, name, active indicator, counts (tasks today, done, reports, pending), completion progress bar
  - **Client Activity**: Grid of client cards with name, health status badge, task count, report count, last activity time

#### Team Monitoring (`/team-monitoring` — TeamMonitoringPage)
Manager's team oversight:
- **4 stat cards**: Team Members, Completion Rate %, Pending Tasks, Overdue Tasks
- **Three tabs**: Overview / Weekly Reports / Daily Logs
- **Overview tab**: Per-member card with avatar, name, role, performance badge (Excellent ≥80% / Good ≥60% / Fair ≥40% / Needs Support), Feedback button, stat grid (total/completed/pending/overdue tasks + reports this week), last report date
- **Weekly Reports tab**: Current week reports — employee, week-of date, status, work summary, challenges, next week plan, submitted timestamp
- **Daily Logs tab**: Last 7 days of `daily_task_logs` — employee, date, hours badge, tasks completed, notes
- **Feedback button**: Opens dialog to send feedback message to team member
- Team members fetched via RPC `get_team_members` (manager-scoped)

#### Assignments (`/assignments` — EnhancedAssignmentsPage)
Team-to-client assignment management:
- **3 stat cards**: Assigned Clients, Total Assignments, Account Managers (count)
- **"New Assignment" button**: Client, Employee, Service (optional), "Set as Account Manager" checkbox
- **Duplicate-assignment check** before insert
- **Delete assignment** (with confirmation)
- **Search** clients by name
- **Assignments grouped by client cards**: Client name, industry, team-member count badge, per-assignment row (avatar, employee name + email, service badge, crown icon if account manager, delete button)

#### Resources (`/resources` — ResourceManagementPage)
Resource planning with three tabs:
- **Capacity Planning**: Week navigation, allocate resources (employee → client → service with hours), table of allocations with utilization % progress bar
- **Time Off**: Request time off (vacation/sick/personal/other with date range + reason), approve/reject pending requests
- **Skills Matrix**: Add skills with proficiency levels and years of experience, table (employee, skill, proficiency badge, years experience)
- Utilization = allocated hours / max_capacity (default 40)

#### Performance (`/performance` — PerformanceScoringPage)
Employee performance scoring (read-only analytics):
- **4 stat cards**: Top Performer, Average Score, Active Employees, Needs Improvement (<60%)
- **Search** by name + **sort** by score or name
- **Table**: Employee (avatar + name + email), overall score (color-coded badge), timeliness %, tasks %, quality %, consistency %, trend badge
- **Click row → detail dialog**: Overall score + 4 metric cards with weights
- **Scoring logic**:
  - Timeliness (30%): on-time reports / submitted reports (due date from client `report_due_day`)
  - Task Completion (30%): completed tasks / total tasks
  - Report Quality (20%): approved reports / submitted reports
  - Consistency (20%): unique weeks with reports / weeks since employee start
  - Overall = weighted sum

### 5.4 Work Section

#### Reports (`/reports` — ReportsPage)
Reports overview:
- **Filter bar**: Client dropdown, week dropdown
- **Reports grouped by client+week** as cards
- Each report shows: service name, employee name, status badge, work summary
- **Download PDF** per client-week (via `generateReportPDF` utility)
- **Export dialog** for bulk CSV/Excel export

#### PDF Reports (`/report-pdf` — ReportPDFPage)
Branded PDF report generator:
- **Select client** + **date range** (start/end)
- **Toggle report sections**: Work Summary, Key Wins, Challenges, Next Week Plan, Metrics
- **Preview panel**: Report cards with week date, service, employee, status, summary snippet
- **Generate PDF**: Branded header with "ClientFlow", per-report sections, metrics summary table, page numbers, footer (jsPDF + autoTable)

#### Client Reports (`/consolidated-reports` — ConsolidatedReportsPage)
All employee reports grouped by client:
- **Client filter** dropdown (All Clients or specific)
- **Date range selector**: 7 / 14 / 30 / 90 days
- **3 stat cards**: Active Clients (in range), Total Reports, Date Range (days)
- **Per-client cards**: Client name, total reports count, last report date, Export button
- Lists each report: title, status badge, employee avatar + name, report date, submitted timestamp, content preview
- **Export** per client → generates a .txt file (Blob download)

#### Tasks (`/tasks` — TasksPage)
Admin task management:
- **3 stat cards**: Pending Tasks, Overdue Tasks, Completed Tasks
- **Task table**: Title+description+remarks, assignee (name+email), client, priority badge, due date (overdue flag), status badge, actions
- **Multi-filter**: search, status, priority, assignee, sort field (due_date/priority/title), sort order
- **Create task**: title, description, assignee, client (optional), priority, due date
- **Edit task**, **toggle complete/pending**
- **Soft delete**

#### Task Detail (`/tasks/:id` — TaskDetailPage)
Full single-task management:
- **Back button** to task list
- **Toggle task status** (pending ↔ completed) via circle icon
- **Edit task** (title, description, assignee, client, priority, due date) via modal
- **Delete task** (soft delete with confirmation)
- **View/edit remarks** (inline textarea with save/cancel)
- **Task Details card**: Description, assigned-to (name + email), due date, client, created date, completed date
- Overdue/due-today badges

#### Calendar (`/calendar` — CalendarPage)
Monthly calendar with drag-and-drop:
- **Month grid** (navigable Previous/Next)
- **Event types**: meeting, deadline, milestone, reminder (color-coded badges)
- **Click empty day** → create event
- **Click event** → edit
- **Drag event** → reschedule (preserves time + duration)
- **Create event**: title, type, start/end time, client (optional), location, description
- **Hard delete** event

#### Goals (`/goals` — GoalsPage)
Client objective tracking:
- **Goal cards**: Status icon, title, priority badge, client, service, date range, description, progress bar (current/target with unit), % complete
- **Status filter tabs**: all/active/completed/on_hold/cancelled
- **Create goal**: title, client, service, description, target/current value, unit, start/target date, status, priority
- **Edit goal**
- **Record Progress** button (active goals with targets) → modal updates `current_value`
- **Expandable progress history** per goal (via `GoalProgressHistory` component)
- **Soft delete**

#### Feedback (`/feedback` — FeedbackPage)
Internal team feedback messaging:
- **3 stat cards**: Sent count, Received count, Unread count
- **Send tab**: Select recipient (active employees, excluding self) + write message
- **Received tab**: List of received feedback with sender name/role/timestamp, unread highlighted, Mark Read button
- **Sent tab**: List of sent feedback with recipient, read status badge, timestamp, message

#### Time Off (`/time-off` — TimeOffPage)
Time-off request management (dual-role):
- **"Request Time Off"**: Type (vacation/sick/personal/other), start/end dates, reason, day-count preview
- **Admin/account_manager**: Approve / Reject buttons on pending requests
- **Role-aware tabs**: Pending (admin only, with count badge) / All Requests (admin only) / My Requests (everyone)
- **3 stat cards**: Total Requests, Pending, Approved

#### Time Tracking (`/time-tracking` — TimeTrackingPage)
Time entry CRUD:
- **"Log Time"**: Employee, Date, Client, Service, Hours (step 0.25), Hourly Rate, Billable checkbox, Description
- **Edit entry** (pencil), **Delete entry** (trash with confirm)
- **Filters**: From date, To date (defaults last 30 days), Employee dropdown
- **2 stat cards**: Total Hours (with entry count), Billable Revenue (sum of hours × hourly_rate)
- **Table**: Date, Employee, Client, Service, Hours, Billable badge, Description, Actions

#### Approvals (`/approvals` — ReportApprovalsPage)
Report review and approval:
- **Filter tabs**: All / submitted / approved / revision_requested (defaults to "submitted")
- **"View Full Report"** → opens `ReportViewModal`
- **"Approve"** (submitted only) → feedback modal (optional feedback) → sets `report_approvals.status = 'approved'`, sets approver_id + approved_at, updates `weekly_reports.approval_status`
- **"Request Revision"** (submitted only) → feedback modal (feedback required) → sets status 'revision_requested', updates weekly report approval_status
- **Cards**: Status badge with icon, creation date, client name, week-of date, submitted-by employee, service, work summary (truncated 200 chars), existing feedback

#### Timesheets (`/timesheets` — TimesheetsManagementPage)
Timesheet review and approval (no sidebar entry, URL-accessible):
- **Status filter**: all/draft/submitted/approved/rejected (defaults "submitted")
- **Week filter** by week_start date
- **Per-row**: View (loads time entries), Approve, Reject (prompts for reason)
- **Bulk approve**: Checkbox selection + "Approve Selected (N)" button
- **Pagination** (20 per page)
- **Time Entries panel** (on View): date, client-service, description, hours, billable badge

### 5.5 Finance Section

#### Budget (`/budget` — BudgetsManagementPage)
Full budget CRUD:
- **"Add Budget"** → modal: Client, Service (optional / "All services"), Monthly Budget, Actual Spending, Currency (USD/EUR/GBP/INR), Start Date, End Date, Notes
- **Edit** and **Delete** per-row
- Computes `budget_utilization = (actual_spending / monthly_budget) * 100` on save
- **Table**: Client, Service, Monthly Budget (with currency), Actual Spending (with trend icon), Utilization badge (On Track <80% / Warning 80-100% / Over Budget ≥100%), Period (start–end)

#### Revenue (`/revenue` — RevenueDashboardPage)
Revenue and profitability tracking:
- **Three tabs**: Monthly Payments, Profitability, Full Schedule
- **Month filter** dropdown
- **4 stat cards**: Monthly Revenue (with avg margin), Net Profit (with cost), Total Outstanding (with overdue count), selected month due/collected
- **Pro-rata billing**: Table for mid-month onboarded clients (client, start date, monthly rate, active days, prorated amount)
- **Monthly Payments tab**: Table with client, onboarded, due, paid, balance, status badge, collection %, record button; Top Outstanding bar chart and payment breakdown
- **Profitability tab**: Table with revenue/mo, cost/mo, profit, margin %, edit button; Top 5 by Revenue and Top 5 by Margin charts
- **Full Schedule tab**: Expandable per-client monthly schedule (month, due, paid, balance, status, paid date, record action)
- **Edit client financials** (monthly revenue + cost) via dialog
- **Record payments** via dialog or inline
- Financials stored in `clients.custom_fields.financials` JSON

#### Benchmarks (`/benchmarks` — PerformanceBenchmarksPage)
Industry benchmark data management:
- **Add/edit benchmarks** via modal: industry, service, metric name, average value, top quartile value, data source, period
- **Search** by metric name or industry
- **Filter** by industry
- **Delete** (with confirmation)

#### Metrics (`/metrics` — CustomMetricsPage)
Custom KPI definitions:
- **Add/edit custom metrics** via modal: metric name, type (number/currency/percentage), service, description, active toggle
- **Search** by metric name
- **Filter** by service
- **Toggle active/inactive**
- **Delete** (with confirmation)

### 5.6 Tools Section

#### Messages (`/communications` — CommunicationHubPage)
Client interaction tracking:
- **3 action buttons**: "Log Communication", "Send Email", "Meeting Notes"
- **Two tabs**: Timeline / Meeting Notes
- **Timeline**: Search + type filter (all/email/call/meeting/message)
- **Log Communication modal**: Client, Type, Direction (inbound/outbound), Subject, Summary, Details
- **Send Email modal**: To, Subject, Body → POSTs to `/api/email/send`
- **Meeting Notes modal**: Client, Date/Time, Title, Attendees (multi-select), Agenda, Notes, Next Meeting datetime
- **4 stat cards**: Total, Emails, Calls, Meetings counts
- Timeline cards: type icon, client, subject, direction badge, timestamp, summary, expandable details, "logged by" user
- Meeting cards: title, client, date, attendees badges, agenda, notes, action items (task/assignee/due), next meeting

#### Templates (`/templates` — EmailTemplatesPage)
Email template management (full CRUD + duplicate):
- **"Create Template"**: Name, Type (report_delivery / deadline_reminder / welcome / status_update / custom), Subject, Body (monospace, supports `{{variables}}` like `{{client_name}}`, `{{week_date}}`, `{{employee_name}}`, `{{report_link}}`)
- **Edit**, **Duplicate** (creates copy with "(Copy)" suffix), **Delete** (with confirmation)
- Card display: name, type badge, subject, body preview, created-by user

#### Import (`/import` — BulkImportPage)
CSV bulk import for 4 entity types:
- **Select import type**: clients, employees, time_entries, goals
- **Download CSV template** (headers + example row)
- **Upload CSV** (client-side parser with quote handling)
- **Import data** (row-by-row with per-row error tracking)
- **View results**: success count, failure count, error list with row numbers
- **Clients**: Direct insert into `clients`
- **Employees**: Checks existing profile, creates auth account with temp password if new, upserts profile
- **Time entries**: Resolves employee/client/service by email/name
- **Goals**: Resolves client by name, inserts with current user as creator

#### Bulk Ops (`/bulk` — BulkOperationsPage)
Bulk status changes:
- **Select operation** from dropdown (grouped: Client Operations / Employee Operations)
- **Multi-select** clients or employees via checkboxes (with select all/deselect all)
- **Operations available**:
  - `activate_clients` — set status to 'active'
  - `pause_clients` — set status to 'paused'
  - `archive_clients` — set status to 'completed'
  - `delete_clients` — hard delete (with confirmation)
  - `deactivate_employees` — set status to 'inactive'
- **Warning card** showing affected item count

#### Portal (`/portal` — ClientPortalPage)
Client portal user management:
- **"Add Portal User"**: Client (select), Full Name, Email, Password (min 6 chars) → creates via `/api/portal-users/create`
- **Toggle active/inactive** status per user
- **Delete** user (with confirmation)
- **Table**: Name, Email, associated Client, Status
- Info card: Portal users have read-only access to their own reports only

### 5.7 System Section

#### Activity Logs (`/logs` — ActivityLogsPage)
Audit trail:
- **"Export Logs"** → CSV export of filtered logs (timestamp, user, action, entity_type, entity_id, ip_address)
- **Search** (full-text across JSON of each log)
- **Action filter**: All / Create (INSERT) / Update (UPDATE) / Delete (DELETE)
- **Entity type filter**: All / Clients / Employees / Assignments / Reports
- **Table** (limit 500): Timestamp, User (full_name or "System"), Action badge (color-coded), Entity type, IP address

#### Settings (`/settings` — SettingsPage)
User account settings (shared admin/employee):
- **Profile Information**: Editable profile image (upload to `custom_fields.profile_image`), full name, email (disabled), phone — toggle Edit mode
- **Regional Settings**: Language (en/es/fr/de), Timezone (UTC + 7 zones), Date Format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- **Notification Preferences**: Email notifications switch, Push notifications switch
- **Account Security**: Change password (current, new, confirm) with live validation indicators (8+ chars, uppercase, number, special char). Re-authenticates with current password first, then calls `supabase.auth.updateUser`.

### 5.8 Additional Admin Pages (No Sidebar Entry)

These pages exist as routes but are not in the sidebar navigation:

#### Email Logs (`/email-logs` — EmailLogsPage)
- **"Compose Email"**: Optional Template selector (auto-fills subject/body), To, Subject, Body → POSTs to `/api/email/send`
- **Search** by recipient/subject/sender
- **Status filter**: all/sent/opened/clicked/failed
- **Date filter** (specific date)
- **4 stat cards**: Total Sent, Open Rate %, Click Rate %, Failed count
- **Table**: Recipient, Subject (+ template used), Sent By, Sent At, Status badge

#### Report Templates (`/report-templates` — ReportTemplatesPage)
- **Create** new template with default content sections (work_summary, key_wins, challenges, next_week_plan)
- **Edit**, **Duplicate** (creates copy with "(Copy)" suffix), **Delete** (with confirmation)
- Optional default client assignment
- Active/inactive toggle
- Card grid: template name, active/inactive badge, description, default client name, created-by user

#### Dashboard Customization (`/customize` — DashboardCustomizationPage)
Per-user dashboard widget management:
- **Add widget** from 10 predefined types (active_clients, pending_reports, revenue_chart, team_utilization, recent_activity, upcoming_deadlines, client_health, goal_progress, time_tracking, budget_alerts)
- **Edit widget** (type, size small/medium/large, visibility)
- **Toggle visibility** (eye icon)
- **Reorder** up/down (swaps positions)
- **Delete** widget (with confirmation)
- Card list: widget label, size badge, hidden badge, description, position number

#### Shared Documents (`/documents` — SharedDocumentsPage)
Client document repository:
- **Upload document**: File picker, client selection, description, permissions (view/download)
- **Download** document (download permission only)
- **Delete** (with confirmation)
- **Search** by file name or description
- **Filter** by client
- **3 stat cards**: Total Documents, Downloadable count, View Only count
- Upload uses `useUpload` hook (Supabase Storage)

---

## 6. Employee Features

Employees see a sidebar with 12 navigation items across 2 sections. Some routes are shared with admin but render different components.

### 6.1 My Work Section

#### My Clients / Dashboard (`/dashboard` — ModernEmployeeDashboard)
Personalized employee landing page:
- **Time-of-day greeting** ("Good morning/afternoon/evening, [firstName]")
- **3 clickable stat cards**: My Clients (→ `/dashboard`), Active Tasks (→ `/tasks`), Reports Due (→ `/reports`)
- **"My Clients" list card** (top 5) with "View All" button: name, status (Active/Paused), health_status badge (Healthy / Needs Attention)
- **"Task Progress" card**: Completed/total ratio with progress bar and first 3 tasks with status badges
- **"Quick Actions" card**: Submit Report → `/reports`, Create Task → `/tasks`, View Calendar → `/calendar`
- Client avatar generation via DiceBear API with initials fallback

#### Submit Report (`/reports` — EnhancedReportSubmissionPage)
Multi-step weekly report submission workflow:

**Step 1 — Assignment Selection:**
- Client cards grouped by client, each listing services as selectable buttons
- Shows the employee's `client_assignments` (joined with `clients` and `services`)

**Step 2 — Report Form:**
- **Week start date picker** (auto-calculated to current week's Monday, editable)
- **Work summary** textarea (required)
- **Status selector**: On Track / Needs Attention / Delayed
- **Service-specific metrics forms** (rendered dynamically based on `service.slug`):
  - `linkedin_outreach`: Connections Sent, Connections Accepted, Responses Received, Positive Responses, Meetings Booked + dynamic Meeting Dates list (add/remove date+description rows)
  - `email_outreach`: Emails Sent, Emails Opened, Click-Through Rate, Responses Received, Positive Responses, Meetings Booked
  - `meta_ads` / `facebook_ads` / `instagram_ads`: Ad Spend, Impressions, Clicks, CTR, Conversions, Cost Per Conversion, ROAS, Leads Generated
  - `google_ads`: Ad Spend, Impressions, Clicks, CTR, Avg CPC, Conversions, Conversion Rate, Quality Score
  - `seo`: Organic Traffic, Keywords Ranking, Top 10 Keywords, Backlinks Acquired, Domain Authority, Pages Indexed, Avg Session Duration, Bounce Rate
  - `social_media` / `social_media_management`: Posts Published, Total Reach, Total Impressions, Engagement Rate, New Followers, Total Likes, Total Comments, Total Shares
  - Fallback amber card if service has no configured metrics form
- **Key Wins**, **Challenges/Blockers**, **Next Week Plan** textareas
- **Report file attachments** (via `ReportAttachments` component — upload + delete, only enabled after a draft is saved)
- **Save Draft** button (manual) + **auto-save every 30 seconds**
- **Submit Report** button
- **"Last Report" sidebar card**: Previous report's date, status badge, work summary
- **"Auto-Save Enabled"** informational banner
- **Success confirmation screen** after submission (auto-dismisses after 2 seconds)
- **Duplicate detection**: Error code 23505 shows user-friendly toast
- On submit: Creates `weekly_reports` (is_draft=false, approval_status='submitted'), `activity_metrics` (LinkedIn), `service_metrics` (other services), `notifications` (success notification), cleans up `report_drafts`

#### My Tasks (`/tasks` — UnifiedTasksPage)
Employee task management (full CRUD):
- **4 stat cards**: Total Tasks, Pending, In Progress, Completed
- **Status filter**: All / Pending / In Progress / Completed / Blocked
- **Tabbed views**: All Tasks, Today (count), Upcoming (count), Overdue (count)
- **"Add Task"** → modal: Title (required), Description, Client (required, from assigned clients), Priority (Low/Medium/High), Status (Pending/In Progress/Completed/Blocked), Due Date (required)
- **Inline "Complete"** button on each non-completed task
- **Click any task row** to edit
- Tasks filtered by `assigned_to` = profile.id, `deleted_at` is null

#### Account Manager (`/account-manager` — AccountManagerDailyView)
*Only visible if employee has `is_account_manager = true` on any assignment*

Account manager's team oversight:
- **4 stat cards**: Assigned Today, Completed Today, Pending Tasks, Team Members count
- **Team Performance card**: Per-member card with avatar, name, email, 4 mini-stats (assigned/completed/pending/clients), Assign Task button
- **Available for Assignment card**: Per-member row with avatar, name, pending count, availability badge (available <6 / moderate 6-15 / busy >15), Assign button
- **Assign new task** via dialog: assign to, client, title, description, priority, due date
- Uses RPC functions: `get_account_manager_daily_tasks`, `get_available_team_members_for_assignment`

#### Team Progress (`/team-progress` — TeamProgressTracker)
Daily progress monitoring (account manager view):
- **Date navigation**: Previous/next day buttons with formatted date display
- **3 stat cards**: Submitted (count), In Progress (count), Not Started (count)
- **Client cards** (collapsible) grouped by managed client
- **Per employee**: Name, service count, list of service tasks with:
  - Service name
  - Combined status badge based on `work_status` (Not Started / In Progress / Completed / On Hold / In Review) and `submission_status` (Submitted overrides)
  - Notes (if present)
  - Submission timestamp (if submitted)
- "Not an Account Manager" empty state if user manages no clients
- Uses RPC: `get_managed_clients()` and `get_team_daily_progress(p_log_date)`

#### Calendar (`/calendar` — CalendarPage)
*Shared with admin — same component*
Monthly calendar with drag-and-drop event management. See admin Calendar section for full details.

#### Time Entry (`/time-entry` — TimeEntryPage)
Weekly timesheet for employees:
- **Week navigation**: Previous/next week buttons with date range display and running total hours
- **Grid layout** (3 rows × 7 days): Each row has a Client selector, Service selector, and 7 day-hour inputs (Mon–Sun)
- **Daily totals row** showing per-day hour sums
- **"Notes & Details"** card with description textarea
- **"Save Time"** button to persist all valid entries (batch insert/update of `time_entries`)
- Reads `clients` (active), `services` (active), `time_entries` (filtered by employee + week range)

### 6.2 Other Section

#### Documents (`/documents` — SharedDocumentsPage)
*Shared with admin — same component*
Client document repository. See admin Shared Documents section for full details.

#### Feedback (`/feedback` — FeedbackPage)
*Shared with admin — same component*
Internal team feedback messaging. See admin Feedback section for full details.

#### Time Off (`/time-off` — TimeOffPage)
*Shared with admin — same component*
Time-off request management. Employees can request; admins/managers can approve/reject. See admin Time Off section for full details.

#### Credentials (`/credentials` — ClientCredentialsPage)
*Shared with admin — same component, but employee-restricted*
Employees see only credentials for clients they're assigned to. Cannot add/edit/delete credentials (admin only). Can toggle password visibility (decrypt via API). See admin Credentials section for full details.

#### Settings (`/settings` — SettingsPage)
*Shared with admin — same component*
User account settings. See admin Settings section for full details.

### 6.3 Employee-Only Widget

#### Upcoming Meetings Priority (UpcomingMeetingsPriority.tsx)
A priority alert widget (not a full page) rendered on the employee dashboard:
- Surfaces clients with recurring weekly meetings happening within the next 3 days
- Per-client sub-card: Client name, Meeting timing label ("Meeting Today" / "Meeting Tomorrow" / "Meeting [DayName]"), Meeting time, Pending task count
- Clients sorted by proximity (days until meeting, ascending)
- Only renders if there are upcoming meetings within 3 days; otherwise renders nothing
- Reads `client_assignments`, `clients` (with non-null `weekly_meeting_day`), `tasks` (count of non-completed tasks per client assigned to the user)

---

## 7. Client Portal Features

The client portal is a **standalone, separate experience** from the admin/employee app. Portal users do not see the sidebar. The portal has its own nav bar, footer, and logout.

### ClientPortalView (`ClientPortalView.tsx`)

#### Portal Layout
- **Top nav bar**: "ClientFlow Portal" branding, client name, portal user name/email, Logout button
- **Footer**: "Powered by ClientFlow — Client Performance Management System"
- **Personalized greeting**: "Good morning/afternoon/evening, [firstName]"

#### Portal Dashboard
- **4 stat cards**:
  - **Total Reports** — count of approved reports
  - **Approved Reports** — count (reviewed and approved)
  - **Latest Status** — status badge of the most recent report + its week date
  - **Account Health** — health score + health label badge (Excellent ≥80, Good ≥60, Needs Attention ≥40, At Risk <40)

#### Report List
- **Filter toggle**: "Recent (10)" vs "All Reports"
- **Report cards**: Week date, status badge, service name badge, employee name badge, created date, truncated work summary
- Only shows reports with `approval_status = 'approved'` for the portal user's client

#### Report Detail View
When a client clicks a report:
- **Back to Reports** button
- **Header**: Week date title, service badge, employee badge, status badge, created date
- **Performance Metrics grid**: Up to 8 metric key/value pairs from `service_metrics.metric_data`
- **Work Summary** section
- **Key Wins** section (green-accented card)
- **Challenges** section (amber-accented card)
- **Next Week's Plan** section (blue-accented card)
- **Report Feedback** component: Allows the client to leave feedback (rating + text) on the report — stored in `report_feedback` table with `portal_user_id`

#### Portal Data Access
- Reads: `client_portal_users` (lookup by `auth_user_id`), `clients` (by portal user's `client_id`), `weekly_reports` (filtered by `client_id` + `approval_status = 'approved'`, joined with `services`, `profiles`, `service_metrics`)
- No create/update/delete on reports — purely read-only with feedback capability

#### Error States
- "Unable to load portal" with Logout button if portal user or client data can't be found
- "No reports available yet" empty state in the report list

---

## 8. Cross-Cutting Features

### Global Search (GlobalSearch.tsx)
- Searches **4 entity types in parallel** via Supabase `ilike` (case-insensitive), limit 5 each:
  - **Clients** — matches `name` → navigates to `/clients/{id}`
  - **Employees** — matches `full_name` → navigates to `/employees`
  - **Reports** — matches `status` → navigates to `/reports`
  - **Tasks** — matches `title` → navigates to `/tasks`
- **Debounced** (300ms) with `Promise.all`
- **Keyboard shortcut**: `Cmd/Ctrl+K` opens dialog; `Esc` closes
- Results grouped by section with sticky headers and badges
- Skeleton loaders + "No results" empty state

### Notification Center (NotificationCenter.tsx)
- Pulls latest 10 notifications from `notifications` table for current `user.id`
- **Realtime**: Uses `useRealtimeNotifications` hook (Supabase Realtime subscription) to prepend new notifications and fire toasts
- **Notification types** (color-coded): `success` (green), `warning` (yellow), `error` (red), `info` (blue, default)
- **Unread badge**: Bell icon with count (caps display at "9+")
- **Actions**: Per-item "Mark as read", "Mark all as read"
- Dropdown closes on backdrop click

### Budget Alerts (BudgetAlerts.tsx)
- Displays alerts from `budget_alerts` joined to `client_budgets` → `clients`
- **Alert types**: `critical` (red, AlertTriangle), `warning` (yellow, TrendingUp), default (blue)
- Shows per-alert: client name, message, budget, spent, utilization % = `actual_spending / monthly_budget * 100`
- **Dismiss**: Sets `is_active = false`
- **Polling**: Reloads every 60 seconds
- Returns null when no alerts

### Client Health Indicator (ClientHealthIndicator.tsx)
- Pure presentational badge component
- **Status mapping**: `healthy` → green CheckCircle "Healthy", `needs_attention` → amber AlertTriangle "Needs Attention", `at_risk` → red AlertCircle "High Risk"
- Props: `healthStatus`, `healthScore` (optional), `showScore`, `size` (sm/md/lg), `showLabel`
- Full dark-mode support

### Theme Toggle (ThemeToggle.tsx)
- Toggles between light and dark themes via `ThemeContext`
- Stored in `user_preferences.theme`

### Error Boundary (ErrorBoundary.tsx)
- Catches React render errors and displays fallback UI

### Offline Banner (OfflineBanner.tsx)
- Shows banner when `navigator.onLine` is false

### Responsive Design
- Mobile navigation via `MobileNav.tsx`
- Responsive tables via `ResponsiveTable.tsx` and `Table.tsx`
- Mobile-specific hooks: `use-mobile.ts`

### Keyboard Shortcuts (useKeyboardShortcuts.ts)
- `Cmd/Ctrl+K` — Global search
- Additional shortcuts defined in the hook

### Auto-Save (useAutoSave.ts)
- Used by report submission page (saves draft every 30 seconds)

### Realtime Subscriptions (useRealtimeSubscription.ts)
- Hook for subscribing to Supabase Realtime table changes

### Secure Data Access (useSecureData.ts)
- Hook for secure data fetching with auth context

### CSV/Excel Export (exportData.ts, enhancedExport.ts, csvParser.ts)
- CSV parsing for bulk import
- CSV/Excel export utilities for reports and activity logs

### PDF Generation (reportPDF.ts)
- Uses jsPDF + jspdf-autotable
- Branded PDF reports with headers, metrics tables, page numbers, footers

### Form Validation (validation.ts, formValidation.ts)
- Email validation
- Password strength validation (8+ chars, uppercase, number, special char)
- Reusable form input components (`FormInput`, `FormSelect`, `FormTextArea`)

---

## 9. End-to-End Workflows

### Workflow 1: Client Onboarding (Admin)

1. **Admin creates client** (`/clients` → Add Client): enters name, industry, contact info, meeting schedule, selects services, assigns team members
2. **Client appears in Onboarding page** (`/onboarding`): 8-step checklist visible
3. **Admin works through checklist**: initial meeting → contract signed → services configured → team assigned → access credentials collected → report template set → kickoff call → portal access
4. **Admin adds client credentials** (`/credentials`): tool name, username, encrypted password for each service/tool
5. **Admin creates portal user** (`/portal`): email, password, associated with client
6. **Onboarding marked complete**: All 8 steps checked, `completed_at` set
7. **Client can now log into portal** to view approved reports

### Workflow 2: Weekly Report Submission (Employee → Admin → Client)

1. **Employee opens Submit Report** (`/reports`): sees their client assignments grouped by client
2. **Selects a client+service assignment**: Form loads with service-specific metrics fields
3. **Fills out report**: work summary, status (On Track/Needs Attention/Delayed), service metrics (e.g., LinkedIn connections sent, ad spend, SEO traffic), key wins, challenges, next week plan
4. **Auto-save**: Draft saves every 30 seconds to `weekly_reports` with `is_draft = true`
5. **Attaches files**: Optional file uploads (only after first draft save)
6. **Submits report**: `weekly_reports.is_draft = false`, `approval_status = 'submitted'`, `submitted_at` set. `service_metrics` and `activity_metrics` rows created. Notification sent.
7. **Admin reviews** (`/approvals`): Sees submitted report in Report Approvals page
8. **Admin approves or requests revision**:
   - **Approve**: `report_approvals.status = 'approved'`, `weekly_reports.approval_status = 'approved'`, approver_id + approved_at set
   - **Request revision**: `report_approvals.status = 'revision_requested'`, feedback required, `weekly_reports.approval_status = 'revision_requested'`
9. **If revision requested**: Employee sees feedback, edits report, resubmits
10. **Once approved**: Report becomes visible in client portal
11. **Client views report** (Client Portal): Sees approved report with metrics, work summary, key wins, challenges, next week plan
12. **Client leaves feedback** (optional): Rating + text stored in `report_feedback`

### Workflow 3: Task Management (Admin → Employee)

1. **Admin creates task** (`/tasks`): Title, description, assignee (employee), client (optional), priority, due date
2. **Employee sees task** (`/tasks`): Appears in their task list with status badges
3. **Employee works on task**: Can change status (Pending → In Progress → Completed)
4. **Employee can create their own tasks**: Same form, auto-assigned to themselves
5. **Admin monitors progress** (`/daily-view`, `/team-monitoring`): Sees task completion rates, overdue tasks
6. **Admin can view task detail** (`/tasks/:id`): Full task info, edit, add remarks, soft delete
7. **Account manager can assign tasks** (`/account-manager`): Sees available team members, assigns tasks based on workload

### Workflow 4: Deal Pipeline (Admin)

1. **Admin creates deal** (`/deals`): Name, client, value, probability, stage, owner, expected close date
2. **Deal appears in pipeline**: Filterable by stage (prospecting → qualified → proposal → negotiation → closed_won/closed_lost)
3. **Admin updates deal stage and probability** as deal progresses
4. **Won deals** contribute to revenue tracking (`/revenue`)
5. **Stats**: Active Deals count, Pipeline Value, Weighted Value (value × probability), Won Deals value

### Workflow 5: Budget & Revenue Management (Admin)

1. **Admin sets client budget** (`/budget`): Monthly budget per client/service, currency, actual spending
2. **Budget utilization auto-calculated**: `actual_spending / monthly_budget * 100`
3. **Budget alerts generated**: Warning at threshold, critical when over budget
4. **Admin sees alerts** via `BudgetAlerts` component (polls every 60 seconds)
5. **Admin tracks revenue** (`/revenue`): Sets monthly revenue + cost per client (stored in `custom_fields.financials`)
6. **Records payments**: Monthly due/collected/balance tracking
7. **Pro-rata billing**: Calculated for mid-month onboarded clients based on `start_date`
8. **Profitability analysis**: Revenue, cost, profit, margin % per client; Top 5 charts

### Workflow 6: Time Tracking & Timesheet Approval (Employee → Admin)

1. **Employee logs time** (`/time-entry`): Weekly grid — selects client, service, enters hours per day
2. **Employee saves time entries**: Batch insert/update to `time_entries`
3. **Admin views all time entries** (`/time-tracking`): Can filter by date range and employee, edit/delete entries
4. **Admin reviews timesheets** (`/timesheets`): Sees submitted timesheets per week
5. **Admin approves or rejects**: Individual or bulk approve; reject prompts for reason
6. **Timesheet status flow**: draft → submitted → approved/rejected

### Workflow 7: Time Off Request (Employee → Admin/Manager)

1. **Employee requests time off** (`/time-off`): Type (vacation/sick/personal/other), date range, reason
2. **Admin/manager sees pending requests**: In Pending tab with count badge
3. **Admin approves or rejects**: Sets status, approved_by, approved_at
4. **Employee sees result**: In My Requests tab with approver name and date

### Workflow 8: Goal Tracking (Admin)

1. **Admin creates goal** (`/goals`): Title, client, service, target value, current value, unit, date range, priority
2. **Goal appears with progress bar**: current/target value with % complete
3. **Admin records progress**: Opens modal, enters new current_value → updates goal, adds `goal_progress` history entry
4. **Progress history visible**: Expandable per goal showing all progress entries with dates and notes
5. **Goal status lifecycle**: active → completed (when target reached) / on_hold / cancelled

### Workflow 9: Team Monitoring (Admin/Manager)

1. **Manager opens Team Monitoring** (`/team-monitoring`): Sees their team members via `get_team_members` RPC
2. **Overview tab**: Per-member performance (Excellent/Good/Fair/Needs Support), task stats (total/completed/pending/overdue), reports this week, last report date
3. **Weekly Reports tab**: Current week reports for all team members with work summary, challenges, next week plan
4. **Daily Logs tab**: Last 7 days of `daily_task_logs` per employee — hours, tasks completed, notes
5. **Manager sends feedback**: Click Feedback button → dialog → message sent to `feedback` table

### Workflow 10: Client Communication Tracking (Admin)

1. **Admin logs communication** (`/communications`): Type (email/call/meeting/message), direction (inbound/outbound), subject, summary, details
2. **Admin sends email**: Via Send Email modal → POSTs to `/api/email/send` → logged in `email_logs`
3. **Admin records meeting notes**: Title, attendees, agenda, notes, action items (task + assignee + due date), next meeting date
4. **Timeline view**: All communications searchable and filterable by type
5. **Meeting Notes tab**: All meeting records with action items

### Workflow 11: Performance Evaluation (Admin)

1. **Admin opens Performance Scoring** (`/performance`): System auto-calculates scores for all employees
2. **Scoring formula**:
   - Timeliness (30% weight): On-time reports / submitted reports
   - Task Completion (30%): Completed tasks / total tasks
   - Report Quality (20%): Approved reports / submitted reports
   - Consistency (20%): Unique weeks with reports / weeks since employee start
3. **Overall score**: Weighted sum, color-coded (green ≥80, yellow ≥60, red <60)
4. **Admin clicks employee**: Detail dialog shows full score breakdown with underlying counts
5. **Admin can compare** against industry benchmarks (`/benchmarks`)

### Workflow 12: Bulk Operations (Admin)

1. **Admin selects operation** (`/bulk`): e.g., "Activate Clients", "Pause Clients", "Archive Clients", "Delete Clients", "Deactivate Employees"
2. **Multi-select targets**: Checkboxes with select all/deselect all
3. **Warning card**: Shows affected item count
4. **Execute**: `Promise.all` over selected IDs to update status or delete
5. **Bulk import** (`/import`): Download CSV template, fill, upload, row-by-row import with error tracking

### Workflow 13: Dashboard Customization (Admin)

1. **Admin opens Customize** (`/customize`): Sees their current widget layout
2. **Adds widgets** from 10 predefined types: active_clients, pending_reports, revenue_chart, team_utilization, recent_activity, upcoming_deadlines, client_health, goal_progress, time_tracking, budget_alerts
3. **Configures each widget**: Type, size (small/medium/large), visibility
4. **Reorders widgets**: Up/down buttons swap positions
5. **Toggles visibility**: Eye icon
6. **Dashboard** (`/dashboard`) respects these widget preferences

### Workflow 14: Client Portal Experience (Client)

1. **Client logs in**: Uses portal credentials (created by admin via `/portal`)
2. **Sees dashboard**: Total reports, approved reports, latest status, account health score
3. **Browses reports**: "Recent (10)" or "All Reports" toggle
4. **Opens a report**: Sees full detail — performance metrics grid, work summary, key wins, challenges, next week plan
5. **Leaves feedback**: Rating + text comment on the report (stored in `report_feedback`)
6. **Logs out**: Returns to login page

---

## Summary of Access by Role

| Feature | Admin | Employee | Client (Portal) |
|---------|-------|----------|-----------------|
| Dashboard (agency-wide) | ✅ | ❌ | ❌ |
| Employee Dashboard (personal) | ❌ | ✅ | ❌ |
| Client Management (CRUD) | ✅ | ❌ | ❌ |
| Client Detail View | ✅ | ❌ | ❌ |
| Client Health Dashboard | ✅ | ❌ | ❌ |
| Deals Pipeline | ✅ | ❌ | ❌ |
| Employee Management (CRUD) | ✅ | ❌ | ❌ |
| Employee Detail View | ✅ | ❌ | ❌ |
| Workload Dashboard | ✅ | ❌ | ❌ |
| Daily View | ✅ | ❌ | ❌ |
| Team Monitoring | ✅ | ❌ | ❌ |
| Assignments Management | ✅ | ❌ | ❌ |
| Resource Management | ✅ | ❌ | ❌ |
| Performance Scoring | ✅ | ❌ | ❌ |
| Report Submission | ✅ (view all) | ✅ (submit own) | ❌ |
| Report Approvals | ✅ | ❌ | ❌ |
| Consolidated Reports | ✅ | ❌ | ❌ |
| PDF Report Generation | ✅ | ❌ | ❌ |
| Report Templates | ✅ | ❌ | ❌ |
| Task Management | ✅ (all tasks) | ✅ (own tasks) | ❌ |
| Task Detail | ✅ | ❌ | ❌ |
| Calendar | ✅ | ✅ | ❌ |
| Goals | ✅ | ❌ | ❌ |
| Feedback | ✅ | ✅ | ❌ |
| Time Off | ✅ (approve) | ✅ (request) | ❌ |
| Time Tracking (admin) | ✅ | ❌ | ❌ |
| Time Entry (employee) | ❌ | ✅ | ❌ |
| Timesheets | ✅ | ❌ | ❌ |
| Budget Management | ✅ | ❌ | ❌ |
| Revenue Dashboard | ✅ | ❌ | ❌ |
| Benchmarks | ✅ | ❌ | ❌ |
| Custom Metrics | ✅ | ❌ | ❌ |
| Communication Hub | ✅ | ❌ | ❌ |
| Email Templates | ✅ | ❌ | ❌ |
| Email Logs | ✅ | ❌ | ❌ |
| Bulk Import | ✅ | ❌ | ❌ |
| Bulk Operations | ✅ | ❌ | ❌ |
| Portal User Management | ✅ | ❌ | ❌ |
| Client Credentials | ✅ (CRUD) | ✅ (view own) | ❌ |
| Client Onboarding | ✅ | ❌ | ❌ |
| Shared Documents | ✅ | ✅ | ❌ |
| Activity Logs | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ |
| Dashboard Customization | ✅ | ❌ | ❌ |
| Global Search | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ❌ |
| Account Manager Daily View | ❌ | ✅ (if AM) | ❌ |
| Team Progress Tracker | ❌ | ✅ | ❌ |
| View Approved Reports | ❌ | ❌ | ✅ |
| Leave Report Feedback | ❌ | ❌ | ✅ |
| Account Health (own) | ❌ | ❌ | ✅ |

---

*This document covers all 48 database tables, 44 admin routes, 13 employee routes, the client portal, 14 end-to-end workflows, and every feature available to each user role in the ClientFlow platform.*
