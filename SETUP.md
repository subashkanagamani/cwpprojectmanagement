# ClientFlow - Setup Guide

## Overview

ClientFlow is an internal client management and weekly reporting tool built for marketing agencies. It helps track employee assignments, collect weekly updates, and generate professional PDF reports.

## Features

### Core Admin Features
- Client Management (CRUD operations)
- Employee Management (Create users with email/password)
- Assignment Engine (Assign employees to clients with specific service roles)
- View all weekly reports with filtering
- Generate downloadable PDF reports per client per week
- Dashboard with overview statistics

### Enhanced Admin Features (New)
- **Analytics Dashboard** - Performance insights, trends, and top performers
- **Budget Tracking** - Monitor budgets per client and service
- **Bulk Operations** - Manage multiple clients/employees at once
- **Client Portal Management** - Create read-only access for clients
- **Activity Logs** - Complete audit trail with export capability
- **Data Export** - Export to CSV, JSON, or HTML formats
- **Advanced Search & Filters** - Quick data access across all pages

### Employee Features
- View assigned clients and services
- Submit weekly reports with service-specific metrics
- Track work summaries, wins, challenges, and plans
- Mobile-optimized interface for on-the-go access

### Services Supported
1. Email Outreach
2. LinkedIn Outreach
3. Meta Ads
4. Google Ads
5. SEO
6. Social Media Management

## Getting Started

### Step 1: Create Your First Admin User

Since this is a fresh installation, you'll need to create your first admin user manually in the database.

1. Navigate to your Supabase dashboard
2. Go to the SQL Editor
3. Run this query to create an admin user:

```sql
-- First, create an auth user (replace with your email and password)
-- Note: You'll need to sign up through the Supabase Auth UI first, then update the profile

-- After signing up through the UI, get your user ID and update the profile:
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@company.com';
```

Alternatively, you can:
1. Use the Employees page (after logging in as any user)
2. Create a new employee with "Admin" role selected

### Step 2: Log In

1. Open the application
2. Enter your email and password
3. Click "Sign In"

### Step 3: Set Up Your Agency

As an admin, follow these steps:

1. **Add Clients**
   - Navigate to "Clients" in the sidebar
   - Click "Add Client"
   - Fill in client details and select services they're using
   - Save

2. **Add Employees**
   - Navigate to "Employees"
   - Click "Add Employee"
   - Enter employee details (name, email, password)
   - Set role to "Employee"
   - Save

3. **Create Assignments**
   - Navigate to "Assignments"
   - Click "New Assignment"
   - Select a client, employee, and service/role
   - This determines what the employee works on for that client
   - Example: Assign "John" to "ABC Corp" for "Email Outreach"

4. **Employees Submit Reports**
   - Employees log in with their credentials
   - They see their assigned clients
   - Navigate to "Submit Report"
   - Select a client/service assignment
   - Fill in the weekly report with metrics
   - Submit

5. **View and Download Reports**
   - As admin, navigate to "Reports"
   - Use filters to find specific client/week
   - Click "Download PDF" to generate a professional report

## Data Model

- **Clients** - Your customer accounts
- **Employees** - Team members with login access
- **Services** - Pre-defined service types (SEO, Ads, etc.)
- **Assignments** - Links employees to clients with specific service roles
- **Weekly Reports** - Employee submissions with metrics and updates
- **Service Metrics** - Service-specific performance data (stored as JSON)

## Security

- Role-based access control (Admin vs Employee)
- Row Level Security (RLS) enforced at database level
- Employees only see their assigned clients
- Admins have full visibility

## Weekly Report Metrics

Each service has specific metrics to track:

### Email Outreach
- Emails Sent
- Replies
- Positive Replies
- Meetings Booked

### LinkedIn Outreach
- Connection Requests Sent
- Accepted
- Replies
- Meetings Booked

### Meta/Google Ads
- Spend
- Impressions
- Clicks
- Leads
- Cost Per Lead (CPL)

### SEO
- Keywords Worked On
- Ranking Improvements
- Traffic Change %
- Pages Optimized
- Backlinks Built

### Social Media
- Posts Published
- Reach
- Engagement
- Follower Growth

## Tips

1. **Assign Multiple Roles**: One employee can handle multiple services for the same client
2. **Weekly Cadence**: Reports are organized by week starting date (Monday)
3. **Status Tracking**: Use "On Track", "Needs Attention", or "Delayed" to flag issues
4. **PDF Reports**: Generate client-facing reports with all team member updates combined
5. **Filtering**: Use the filter options in Reports page to find specific submissions

## Support

This is an internal tool. Contact your system administrator for access or technical issues.
