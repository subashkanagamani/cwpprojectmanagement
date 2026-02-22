export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string
          role: 'admin' | 'employee'
          status: 'active' | 'inactive'
          skills: Json
          max_capacity: number
          phone: string | null
          manager_id: string | null
          custom_fields: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          email: string
          full_name: string
          role: 'admin' | 'employee'
          status?: 'active' | 'inactive'
          skills?: Json
          max_capacity?: number
          phone?: string | null
          manager_id?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'employee'
          status?: 'active' | 'inactive'
          skills?: Json
          max_capacity?: number
          phone?: string | null
          manager_id?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          industry: string | null
          status: string
          start_date: string
          notes: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          website: string | null
          priority: string
          health_status: string
          health_score: number
          last_activity_date: string | null
          custom_fields: Json
          report_due_day: number
          weekly_meeting_day: number | null
          meeting_time: string
          meeting_reminder_hours: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          status?: string
          start_date?: string
          notes?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          website?: string | null
          priority?: string
          health_status?: string
          health_score?: number
          last_activity_date?: string | null
          custom_fields?: Json
          report_due_day?: number
          weekly_meeting_day?: number | null
          meeting_time?: string
          meeting_reminder_hours?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          status?: string
          start_date?: string
          notes?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          website?: string | null
          priority?: string
          health_status?: string
          health_score?: number
          last_activity_date?: string | null
          custom_fields?: Json
          report_due_day?: number
          weekly_meeting_day?: number | null
          meeting_time?: string
          meeting_reminder_hours?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      client_services: {
        Row: {
          id: string
          client_id: string
          service_id: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          created_at?: string
        }
      }
      client_assignments: {
        Row: {
          id: string
          client_id: string
          employee_id: string
          service_id: string
          is_active: boolean
          is_account_manager: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          employee_id: string
          service_id: string
          is_active?: boolean
          is_account_manager?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          employee_id?: string
          service_id?: string
          is_active?: boolean
          is_account_manager?: boolean
          deleted_at?: string | null
          created_at?: string
        }
      }
      daily_task_logs: {
        Row: {
          id: string
          assignment_id: string
          employee_id: string
          client_id: string
          service_id: string
          log_date: string
          metrics: Json
          notes: string | null
          status: string
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          employee_id: string
          client_id: string
          service_id: string
          log_date?: string
          metrics?: Json
          notes?: string | null
          status?: string
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          employee_id?: string
          client_id?: string
          service_id?: string
          log_date?: string
          metrics?: Json
          notes?: string | null
          status?: string
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weekly_reports: {
        Row: {
          id: string
          client_id: string
          employee_id: string
          service_id: string
          week_start_date: string
          work_summary: string | null
          status: string
          key_wins: string | null
          challenges: string | null
          next_week_plan: string | null
          approval_status: string
          is_draft: boolean
          last_auto_saved: string | null
          report_template_id: string | null
          submitted_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          employee_id: string
          service_id: string
          week_start_date: string
          work_summary?: string | null
          status?: string
          key_wins?: string | null
          challenges?: string | null
          next_week_plan?: string | null
          approval_status?: string
          is_draft?: boolean
          last_auto_saved?: string | null
          report_template_id?: string | null
          submitted_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          employee_id?: string
          service_id?: string
          week_start_date?: string
          work_summary?: string | null
          status?: string
          key_wins?: string | null
          challenges?: string | null
          next_week_plan?: string | null
          approval_status?: string
          is_draft?: boolean
          last_auto_saved?: string | null
          report_template_id?: string | null
          submitted_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_metrics: {
        Row: {
          id: string
          weekly_report_id: string
          metric_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          weekly_report_id: string
          metric_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          weekly_report_id?: string
          metric_data?: Json
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          client_id: string
          deal_name: string
          deal_value: number
          stage: string
          probability: number
          expected_close_date: string | null
          owner_id: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          deal_name: string
          deal_value?: number
          stage?: string
          probability?: number
          expected_close_date?: string | null
          owner_id?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          deal_name?: string
          deal_value?: number
          stage?: string
          probability?: number
          expected_close_date?: string | null
          owner_id?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          message?: string
          read?: boolean
          created_at?: string
        }
      }
      time_off_requests: {
        Row: {
          id: string
          employee_id: string
          type: string
          start_date: string
          end_date: string
          reason: string | null
          status: string
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          type: string
          start_date: string
          end_date: string
          reason?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          type?: string
          start_date?: string
          end_date?: string
          reason?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_logs: {
        Row: {
          id: string
          recipient_email: string
          subject: string
          body: string | null
          template_used: string | null
          status: string
          sent_by: string | null
          client_id: string | null
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          recipient_email: string
          subject: string
          body?: string | null
          template_used?: string | null
          status?: string
          sent_by?: string | null
          client_id?: string | null
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          recipient_email?: string
          subject?: string
          body?: string | null
          template_used?: string | null
          status?: string
          sent_by?: string | null
          client_id?: string | null
          sent_at?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          assigned_to: string
          created_by: string | null
          client_id: string | null
          priority: string
          due_date: string
          status: string
          completed_at: string | null
          remarks: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assigned_to: string
          created_by?: string | null
          client_id?: string | null
          priority?: string
          due_date: string
          status?: string
          completed_at?: string | null
          remarks?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assigned_to?: string
          created_by?: string | null
          client_id?: string | null
          priority?: string
          due_date?: string
          status?: string
          completed_at?: string | null
          remarks?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type ClientService = Database['public']['Tables']['client_services']['Row']
export type ClientAssignment = Database['public']['Tables']['client_assignments']['Row']
export type WeeklyReport = Database['public']['Tables']['weekly_reports']['Row']
export type ServiceMetric = Database['public']['Tables']['service_metrics']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type TimeOffRequest = Database['public']['Tables']['time_off_requests']['Row']
export type EmailLog = Database['public']['Tables']['email_logs']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']

export interface EmailOutreachMetrics {
  emails_sent: number
  replies: number
  positive_replies: number
  meetings_booked: number
}

export interface LinkedInOutreachMetrics {
  connection_requests_sent: number
  accepted: number
  replies: number
  meetings_booked: number
}

export interface MetaAdsMetrics {
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}

export interface GoogleAdsMetrics {
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}

export interface SEOMetrics {
  keywords_worked_on: number
  ranking_improvements: number
  traffic_change_percent: number
  pages_optimized: number
  backlinks_built: number
}

export interface SocialMediaMetrics {
  posts_published: number
  reach: number
  engagement: number
  follower_growth: number
}

export type MetricData =
  | EmailOutreachMetrics
  | LinkedInOutreachMetrics
  | MetaAdsMetrics
  | GoogleAdsMetrics
  | SEOMetrics
  | SocialMediaMetrics

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Json
  ip_address: string | null
  created_at: string
}

export interface ReportApproval {
  id: string
  report_id: string
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested'
  approver_id: string | null
  approved_at: string | null
  feedback: string | null
  created_at: string
  updated_at: string
}

export interface ReportAttachment {
  id: string
  report_id: string
  file_name: string
  file_path: string | null
  file_url: string | null
  file_size: number
  file_type: string | null
  uploaded_by: string
  created_at: string
}

export interface ReportComment {
  id: string
  report_id: string
  user_id: string
  is_internal: boolean
  comment: string
  created_at: string
  updated_at: string
}

export interface ReportRevision {
  id: string
  report_id: string
  version: number
  data: Json
  changed_by: string
  created_at: string
}

export interface ClientBudget {
  id: string
  client_id: string
  service_id: string
  monthly_budget: number
  actual_spending: number
  budget_utilization: number
  currency: string
  start_date: string
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientPortalUser {
  id: string
  client_id: string
  email: string
  full_name: string
  auth_user_id: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface PerformanceBenchmark {
  id: string
  service_id: string
  industry: string
  metric_name: string
  benchmark_value: number
  period: string
  created_at: string
  updated_at: string
}

export interface CustomMetric {
  id: string
  service_id: string
  metric_name: string
  metric_type: 'number' | 'currency' | 'percentage'
  description: string | null
  is_active: boolean
  created_at: string
}

export interface ReportDraft {
  id: string
  employee_id: string
  client_id: string
  service_id: string
  week_start_date: string
  draft_data: Json
  created_at: string
  updated_at: string
}

export interface ActivityMetrics {
  id: string
  report_id: string
  metric_type: string
  connections_sent: number
  connections_accepted: number
  responses_received: number
  positive_responses: number
  meetings_booked: number
  meeting_dates: Json
  custom_metrics: Json
  created_at: string
}

export interface ReportTemplate {
  id: string
  name: string
  description: string | null
  template_data: Json
  created_by: string
  is_default: boolean
  created_at: string
}

export interface EmployeeTask {
  id: string
  employee_id: string
  title: string
  description: string | null
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  created_by: string
  created_at: string
  completed_at: string | null
}

export interface ClientNote {
  id: string
  client_id: string
  employee_id: string
  note: string
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  client_id: string
  service_id: string | null
  hours: number
  date: string
  description: string | null
  is_billable: boolean
  hourly_rate: number | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  link: string | null
  created_at: string
}

export interface BudgetAlert {
  id: string
  client_budget_id: string
  threshold_percentage: number
  alert_sent: boolean
  alert_sent_at: string | null
  created_at: string
}

export interface SharedDocument {
  id: string
  client_id: string
  file_name: string
  file_url: string
  file_type: string | null
  uploaded_by: string
  description: string | null
  file_size: number
  permissions: string
  created_at: string
}

export interface ReportFeedback {
  id: string
  report_id: string
  portal_user_id: string
  rating: number | null
  feedback: string | null
  created_at: string
}

export interface DailyTaskLog {
  id: string
  assignment_id: string
  employee_id: string
  client_id: string
  service_id: string
  log_date: string
  metrics: Record<string, any>
  notes: string | null
  status: 'pending' | 'submitted'
  submitted_at: string | null
  created_at: string
  updated_at: string
  client_assignments?: {
    id: string
    clients?: { id: string; name: string }
    services?: { id: string; name: string; slug: string }
  }
}

export interface ClientCredential {
  id: string
  client_id: string
  tool_name: string
  username: string
  encrypted_password: string
  notes: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  client_id: string
  service_id: string | null
  title: string
  description: string | null
  target_value: number | null
  current_value: number
  unit: string | null
  start_date: string
  target_date: string
  status: string
  priority: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Communication {
  id: string
  client_id: string
  type: string
  direction: string
  subject: string | null
  summary: string
  content: string | null
  created_by: string
  created_at: string
}

export interface MeetingNote {
  id: string
  client_id: string
  title: string
  date: string
  attendees: Json
  agenda: string | null
  notes: string
  action_items: Json
  next_meeting: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_type: string
  start_time: string
  end_time: string | null
  client_id: string | null
  attendees: Json
  location: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Timesheet {
  id: string
  employee_id: string
  week_start: string
  status: string
  total_hours: number
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}
