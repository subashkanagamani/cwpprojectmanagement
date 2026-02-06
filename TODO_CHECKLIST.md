# CLIENTFLOW - TODO CHECKLIST

## 🔴 PRIORITY 1: SECURITY (Critical - Do First!)

- [ ] Password reset functionality
  - [ ] Add resetPassword() method to AuthContext
  - [ ] Create PasswordResetPage component
  - [ ] Add "Forgot Password" link to login page
  - [ ] Test reset flow end-to-end

- [ ] Email verification on signup
  - [ ] Enable email confirmation in Supabase Auth settings
  - [ ] Update signup flow to require confirmation
  - [ ] Add "Resend verification" option
  - [ ] Block login until email verified

- [ ] Frontend route protection
  - [ ] Create ProtectedRoute component
  - [ ] Check user role before allowing access
  - [ ] Wrap all admin routes with ProtectedRoute
  - [ ] Show 403 page for unauthorized access

- [ ] Soft delete implementation
  - [ ] Add deleted_at column to clients table
  - [ ] Add deleted_at column to profiles table
  - [ ] Add deleted_at column to weekly_reports table
  - [ ] Update all queries to filter deleted records
  - [ ] Add "Restore" functionality for admins
  - [ ] Update delete functions to set deleted_at instead

- [ ] Form validation improvements
  - [ ] Add password strength requirements (8+ chars, uppercase, lowercase, number)
  - [ ] Add email format validation
  - [ ] Add required field validation to all forms
  - [ ] Show clear error messages

---

## 🟠 PRIORITY 2: CORE FEATURES

### PDF Export
- [ ] Create src/utils/reportPDF.ts
- [ ] Import jsPDF and jspdf-autotable
- [ ] Implement generateReportPDF() function
- [ ] Add company logo to PDF
- [ ] Format report data into PDF
- [ ] Add metrics table to PDF
- [ ] Add download button to ReportsPage
- [ ] Test PDF generation with real data

### File Upload to Storage
- [ ] Create 'report-attachments' bucket in Supabase Storage
- [ ] Set bucket permissions (authenticated users can upload)
- [ ] Update FileUpload.tsx with actual upload logic
- [ ] Save file metadata to report_attachments table
- [ ] Display uploaded files in ReportAttachments component
- [ ] Add download functionality for attachments
- [ ] Add delete functionality for attachments
- [ ] Test file upload/download flow

### Bulk Import
- [ ] Install papaparse: `npm install papaparse`
- [ ] Create src/utils/csvParser.ts
- [ ] Implement CSV parsing logic
- [ ] Add data validation for each import type
- [ ] Update BulkImportPage with parsing logic
- [ ] Create CSV templates for download
- [ ] Handle errors gracefully with row numbers
- [ ] Show success/failure counts
- [ ] Test with valid and invalid CSV files

### Email Notifications
- [ ] Sign up for Resend or SendGrid
- [ ] Add API key to Supabase secrets
- [ ] Create supabase/functions/send-email/index.ts
- [ ] Implement email template rendering
- [ ] Create email templates (report-approved, task-assigned, etc.)
- [ ] Call email function from frontend when needed
- [ ] Add email preferences to user settings
- [ ] Test email delivery

### Real-Time Notifications
- [ ] Remove polling interval from NotificationCenter
- [ ] Set up Supabase Realtime subscription
- [ ] Subscribe to notifications table INSERT events
- [ ] Filter by user_id
- [ ] Update notification list on new events
- [ ] Add notification sound (optional)
- [ ] Test real-time updates across browser tabs

---

## 🟡 PRIORITY 3: DATA INTEGRATION

### Budget Automation
- [ ] Create database function update_budget_spending()
- [ ] Create trigger on time_entries table
- [ ] Test automatic spending calculation
- [ ] Verify spending updates when time entries change
- [ ] Add manual override option for admins

### Automatic Budget Alerts
- [ ] Create supabase/functions/check-budgets/index.ts
- [ ] Implement budget threshold checking
- [ ] Create alerts when >80%, >90%, >100%
- [ ] Schedule function to run daily via cron
- [ ] Test alert creation
- [ ] Send notifications when alerts trigger

### Assignment History
- [ ] Add start_date and end_date to client_assignments
- [ ] Add ended_at field for historical tracking
- [ ] Create assignment_history table (optional)
- [ ] Track when assignments are created/modified/ended
- [ ] Show assignment timeline in client detail

---

## 🟢 PRIORITY 4: UI/UX IMPROVEMENTS

### Loading States
- [ ] Create LoadingButton component
- [ ] Replace all submit buttons with LoadingButton
- [ ] Add loading spinners to data tables
- [ ] Add skeleton loaders for dashboard
- [ ] Add loading overlay for modals

### Confirmation Dialogs
- [ ] Create ConfirmDialog component
- [ ] Add confirmation before deleting clients
- [ ] Add confirmation before deleting employees
- [ ] Add confirmation before deleting assignments
- [ ] Add confirmation before bulk delete
- [ ] Add confirmation before bulk status changes

### Error Messages
- [ ] Create formatError() utility function
- [ ] Handle Supabase error codes (23505, 23503, etc.)
- [ ] Handle network errors
- [ ] Handle auth errors
- [ ] Use formatted errors in all catch blocks
- [ ] Test error messages are user-friendly

### Mobile Responsiveness
- [ ] Test all tables on mobile devices
- [ ] Add horizontal scroll to wide tables
- [ ] Hide non-essential columns on mobile
- [ ] Create card view alternative for tables
- [ ] Test forms on mobile
- [ ] Increase touch target sizes (min 44x44px)
- [ ] Test charts on mobile
- [ ] Make charts responsive with proper sizing

---

## 🔵 PRIORITY 5: TESTING & QUALITY

### E2E Tests
- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Create tests/e2e directory
- [ ] Write auth.spec.ts (login, signup, logout)
- [ ] Write clients.spec.ts (CRUD operations)
- [ ] Write reports.spec.ts (submit, view, approve)
- [ ] Add test script to package.json
- [ ] Set up CI/CD to run tests

### Form Validation
- [ ] Create src/utils/formValidation.ts
- [ ] Add validators for email, password, required
- [ ] Add validation to login form
- [ ] Add validation to signup form
- [ ] Add validation to client form
- [ ] Add validation to employee form
- [ ] Add validation to report form
- [ ] Show validation errors clearly

### Manual Testing
- [ ] Test login/logout flows
- [ ] Test client CRUD operations
- [ ] Test employee CRUD operations
- [ ] Test assignment creation
- [ ] Test report submission
- [ ] Test report approval
- [ ] Test budget tracking
- [ ] Test time tracking
- [ ] Test all filters and search
- [ ] Test pagination
- [ ] Test exports
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)

---

## ⚪ NICE TO HAVE (Future Enhancements)

### Calendar
- [ ] Install calendar library (e.g., FullCalendar)
- [ ] Implement calendar UI
- [ ] Add event creation
- [ ] Add day/week/month views
- [ ] Link events to clients
- [ ] Add event reminders

### Resource Management
- [ ] Build capacity visualization
- [ ] Add resource allocation UI
- [ ] Add conflict detection
- [ ] Show utilization charts
- [ ] Add forecasting

### Advanced Analytics
- [ ] Add custom date range picker
- [ ] Implement drill-down in charts
- [ ] Add budget forecasting
- [ ] Add trend analysis
- [ ] Add predictive analytics

### Integrations
- [ ] Google Calendar sync
- [ ] Slack notifications
- [ ] Email integration (Gmail/Outlook)
- [ ] CRM integration options

---

## 🚀 QUICK WINS (Can Do Today)

- [ ] Add "Forgot Password" link to login (link to docs for now)
- [ ] Add password length validation (min 8 chars)
- [ ] Add confirmation before delete (alert for now)
- [ ] Add loading state to submit buttons (disabled + text)
- [ ] Hide admin menu for employees
- [ ] Add "Coming Soon" badges to incomplete features
- [ ] Fix table scroll on mobile (overflow-x-auto)
- [ ] Add .env.example file
- [ ] Add README with setup instructions
- [ ] Add error boundary around app

---

## 📁 FILES TO CREATE

- [ ] `src/utils/reportPDF.ts`
- [ ] `src/utils/csvParser.ts`
- [ ] `src/utils/formValidation.ts`
- [ ] `src/utils/formatError.ts`
- [ ] `src/components/ConfirmDialog.tsx`
- [ ] `src/components/LoadingButton.tsx`
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] `supabase/functions/send-email/index.ts`
- [ ] `supabase/functions/check-budgets/index.ts`
- [ ] `tests/e2e/auth.spec.ts`
- [ ] `.env.example`
- [ ] `README.md` (comprehensive setup guide)

---

## 📝 FILES TO UPDATE

- [ ] `src/components/FileUpload.tsx` - Add Storage integration
- [ ] `src/components/admin/BulkImportPage.tsx` - Add CSV logic
- [ ] `src/components/NotificationCenter.tsx` - Add Realtime
- [ ] `src/components/admin/ReportsPage.tsx` - Add PDF button
- [ ] `src/contexts/AuthContext.tsx` - Add password reset
- [ ] `src/components/LoginPage.tsx` - Add forgot password link
- [ ] `src/App.tsx` - Add route protection
- [ ] All pages with delete - Add confirmations

---

## 📊 PROGRESS TRACKING

**Total Items**: ~150
**Completed**: Check items as you complete them
**In Progress**: Mark with ⏳
**Blocked**: Mark with 🚫

### Sprint Planning
**Sprint 1 (Week 1)**: Priority 1 - Security
**Sprint 2 (Week 2-3)**: Priority 2 - Core Features
**Sprint 3 (Week 4)**: Priority 3 - Data Integration
**Sprint 4 (Week 5)**: Priority 4 - UI/UX
**Sprint 5 (Week 6)**: Priority 5 - Testing

---

## 🎯 DEFINITION OF DONE

For each feature to be considered "done":
- [ ] Code implemented and tested locally
- [ ] No console errors or warnings
- [ ] Works on desktop and mobile
- [ ] Error handling in place
- [ ] Loading states added
- [ ] Success/error messages shown
- [ ] Committed to git with clear message
- [ ] Documented if needed
- [ ] Tested by another person

---

**Last Updated**: February 1, 2026
**Owner**: Development Team
**Next Review**: End of Week 1
