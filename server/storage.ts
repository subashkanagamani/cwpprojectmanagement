import {
  profiles, clients, services, clientServices, clientAssignments,
  weeklyReports, serviceMetrics, activityLogs, reportApprovals,
  reportAttachments, reportComments, reportRevisions, clientBudgets,
  clientPortalUsers, performanceBenchmarks, customMetrics, reportDrafts,
  activityMetrics, reportTemplates, employeeTasks, clientNotes,
  timeEntries, notifications, budgetAlerts, sharedDocuments, reportFeedback,
  tasks, clientCredentials, goals, goalProgress, communications, meetingNotes,
  calendarEvents, resourceAllocations, emailTemplates, clientHealthScores,
  timesheets, internalComments, savedFilters, userPreferences,
  dashboardWidgets, notificationPreferences, users,
  type Profile, type Client, type Service, type WeeklyReport, type Task, type User
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull, sql, ilike, or, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, password: string): Promise<User>;

  getProfiles(): Promise<Profile[]>;
  getProfileById(id: string): Promise<Profile | undefined>;
  getProfileByUserId(userId: number): Promise<Profile | undefined>;
  createProfile(data: any): Promise<Profile>;
  updateProfile(id: string, data: any): Promise<Profile | undefined>;

  getClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | undefined>;
  createClient(data: any): Promise<Client>;
  updateClient(id: string, data: any): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  getServices(): Promise<Service[]>;
  createService(data: any): Promise<Service>;

  queryTable(table: string, params: any): Promise<any[]>;
  insertIntoTable(table: string, data: any): Promise<any>;
  updateInTable(table: string, id: string, data: any): Promise<any>;
  deleteFromTable(table: string, id: string): Promise<void>;
  upsertInTable(table: string, data: any, conflictField?: string): Promise<any>;
}

const TABLE_MAP: Record<string, any> = {
  profiles, clients, services, client_services: clientServices,
  client_assignments: clientAssignments, weekly_reports: weeklyReports,
  service_metrics: serviceMetrics, activity_logs: activityLogs,
  report_approvals: reportApprovals, report_attachments: reportAttachments,
  report_comments: reportComments, report_revisions: reportRevisions,
  client_budgets: clientBudgets, client_portal_users: clientPortalUsers,
  performance_benchmarks: performanceBenchmarks, custom_metrics: customMetrics,
  report_drafts: reportDrafts, activity_metrics: activityMetrics,
  report_templates: reportTemplates, employee_tasks: employeeTasks,
  client_notes: clientNotes, time_entries: timeEntries,
  notifications, budget_alerts: budgetAlerts, shared_documents: sharedDocuments,
  report_feedback: reportFeedback, tasks, client_credentials: clientCredentials,
  goals, goal_progress: goalProgress, communications,
  meeting_notes: meetingNotes, calendar_events: calendarEvents,
  resource_allocations: resourceAllocations, email_templates: emailTemplates,
  client_health_scores: clientHealthScores, timesheets,
  internal_comments: internalComments, saved_filters: savedFilters,
  user_preferences: userPreferences, dashboard_widgets: dashboardWidgets,
  notification_preferences: notificationPreferences,
};

const COLUMN_MAP: Record<string, Record<string, string>> = {
  profiles: { full_name: "fullName", max_capacity: "maxCapacity", custom_fields: "customFields", created_at: "createdAt", updated_at: "updatedAt", deleted_at: "deletedAt", user_id: "userId" },
  clients: { start_date: "startDate", contact_name: "contactName", contact_email: "contactEmail", contact_phone: "contactPhone", health_status: "healthStatus", health_score: "healthScore", last_activity_date: "lastActivityDate", custom_fields: "customFields", report_due_day: "reportDueDay", weekly_meeting_day: "weeklyMeetingDay", meeting_time: "meetingTime", meeting_reminder_hours: "meetingReminderHours", created_at: "createdAt", updated_at: "updatedAt", deleted_at: "deletedAt" },
  services: { is_active: "isActive", created_at: "createdAt" },
  client_services: { client_id: "clientId", service_id: "serviceId", created_at: "createdAt" },
  client_assignments: { client_id: "clientId", employee_id: "employeeId", service_id: "serviceId", created_at: "createdAt", deleted_at: "deletedAt" },
  weekly_reports: { client_id: "clientId", employee_id: "employeeId", service_id: "serviceId", week_start_date: "weekStartDate", work_summary: "workSummary", key_wins: "keyWins", next_week_plan: "nextWeekPlan", approval_status: "approvalStatus", is_draft: "isDraft", last_auto_saved: "lastAutoSaved", report_template_id: "reportTemplateId", submitted_at: "submittedAt", created_at: "createdAt", updated_at: "updatedAt", deleted_at: "deletedAt" },
  service_metrics: { weekly_report_id: "weeklyReportId", metric_data: "metricData", created_at: "createdAt" },
  activity_logs: { user_id: "userId", entity_type: "entityType", entity_id: "entityId", ip_address: "ipAddress", created_at: "createdAt" },
  report_approvals: { report_id: "reportId", approver_id: "approverId", approved_at: "approvedAt", created_at: "createdAt", updated_at: "updatedAt" },
  report_attachments: { report_id: "reportId", file_name: "fileName", file_path: "filePath", file_url: "fileUrl", file_size: "fileSize", file_type: "fileType", uploaded_by: "uploadedBy", created_at: "createdAt" },
  report_comments: { report_id: "reportId", user_id: "userId", is_internal: "isInternal", created_at: "createdAt", updated_at: "updatedAt" },
  report_revisions: { report_id: "reportId", changed_by: "changedBy", created_at: "createdAt" },
  client_budgets: { client_id: "clientId", service_id: "serviceId", monthly_budget: "monthlyBudget", actual_spending: "actualSpending", budget_utilization: "budgetUtilization", start_date: "startDate", end_date: "endDate", created_at: "createdAt", updated_at: "updatedAt" },
  client_portal_users: { client_id: "clientId", full_name: "fullName", user_id: "userId", is_active: "isActive", last_login_at: "lastLoginAt", created_at: "createdAt", updated_at: "updatedAt" },
  performance_benchmarks: { service_id: "serviceId", metric_name: "metricName", benchmark_value: "benchmarkValue", created_at: "createdAt", updated_at: "updatedAt" },
  custom_metrics: { service_id: "serviceId", metric_name: "metricName", metric_type: "metricType", is_active: "isActive", created_at: "createdAt" },
  report_drafts: { employee_id: "employeeId", client_id: "clientId", service_id: "serviceId", week_start_date: "weekStartDate", draft_data: "draftData", created_at: "createdAt", updated_at: "updatedAt" },
  activity_metrics: { report_id: "reportId", metric_type: "metricType", connections_sent: "connectionsSent", connections_accepted: "connectionsAccepted", responses_received: "responsesReceived", positive_responses: "positiveResponses", meetings_booked: "meetingsBooked", meeting_dates: "meetingDates", custom_metrics: "customMetricsData", metric_name: "metricName", metric_value: "metricValue", recorded_at: "recordedAt" },
  report_templates: { template_data: "templateData", created_by: "createdBy", is_default: "isDefault", is_active: "isActive", created_at: "createdAt", updated_at: "updatedAt" },
  employee_tasks: { employee_id: "employeeId", due_date: "dueDate", created_by: "createdBy", created_at: "createdAt", completed_at: "completedAt" },
  client_notes: { client_id: "clientId", employee_id: "employeeId", created_at: "createdAt", updated_at: "updatedAt" },
  time_entries: { employee_id: "employeeId", client_id: "clientId", service_id: "serviceId", is_billable: "isBillable", hourly_rate: "hourlyRate", created_at: "createdAt" },
  notifications: { user_id: "userId", is_read: "isRead", created_at: "createdAt" },
  budget_alerts: { client_budget_id: "clientBudgetId", threshold_percentage: "thresholdPercentage", alert_sent: "alertSent", alert_sent_at: "alertSentAt", created_at: "createdAt" },
  shared_documents: { client_id: "clientId", file_name: "fileName", file_url: "fileUrl", file_type: "fileType", uploaded_by: "uploadedBy", file_size: "fileSize", created_at: "createdAt" },
  report_feedback: { report_id: "reportId", portal_user_id: "portalUserId", created_at: "createdAt" },
  tasks: { assigned_to: "assignedTo", created_by: "createdBy", client_id: "clientId", due_date: "dueDate", completed_at: "completedAt", deleted_at: "deletedAt", created_at: "createdAt", updated_at: "updatedAt" },
  client_credentials: { client_id: "clientId", tool_name: "toolName", encrypted_password: "encryptedPassword", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  goals: { client_id: "clientId", service_id: "serviceId", target_value: "targetValue", current_value: "currentValue", start_date: "startDate", target_date: "targetDate", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  goal_progress: { goal_id: "goalId", recorded_by: "recordedBy", recorded_at: "recordedAt" },
  communications: { client_id: "clientId", created_by: "createdBy", created_at: "createdAt" },
  meeting_notes: { client_id: "clientId", action_items: "actionItems", next_meeting: "nextMeeting", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  calendar_events: { event_type: "eventType", start_time: "startTime", end_time: "endTime", client_id: "clientId", is_recurring: "isRecurring", recurrence_rule: "recurrenceRule", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  resource_allocations: { employee_id: "employeeId", client_id: "clientId", service_id: "serviceId", allocated_hours: "allocatedHours", week_start: "weekStart", created_at: "createdAt", updated_at: "updatedAt" },
  email_templates: { template_type: "templateType", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  client_health_scores: { client_id: "clientId", calculated_at: "calculatedAt", next_review_date: "nextReviewDate" },
  timesheets: { employee_id: "employeeId", week_start: "weekStart", total_hours: "totalHours", submitted_at: "submittedAt", approved_at: "approvedAt", approved_by: "approvedBy", created_at: "createdAt", updated_at: "updatedAt" },
  internal_comments: { entity_type: "entityType", entity_id: "entityId", user_id: "userId", created_at: "createdAt", updated_at: "updatedAt" },
  saved_filters: { user_id: "userId", filter_name: "filterName", filter_data: "filterData", is_shared: "isShared", created_at: "createdAt" },
  user_preferences: { user_id: "userId", date_format: "dateFormat", time_format: "timeFormat", items_per_page: "itemsPerPage", default_view: "defaultView", created_at: "createdAt", updated_at: "updatedAt" },
  dashboard_widgets: { user_id: "userId", widget_type: "widgetType", is_visible: "isVisible", created_at: "createdAt", updated_at: "updatedAt" },
  notification_preferences: { user_id: "userId", email_enabled: "emailEnabled", email_digest: "emailDigest", browser_enabled: "browserEnabled", deadline_reminders: "deadlineReminders", mention_notifications: "mentionNotifications", approval_notifications: "approvalNotifications", created_at: "createdAt", updated_at: "updatedAt" },
};

function snakeToCamel(data: any, tableName: string): any {
  if (!data) return data;
  const colMap = COLUMN_MAP[tableName] || {};
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    const camelKey = colMap[key] || key;
    result[camelKey] = value;
  }
  return result;
}

function camelToSnake(data: any, tableName: string): any {
  if (!data) return data;
  const colMap = COLUMN_MAP[tableName] || {};
  const reverseMap: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(colMap)) {
    reverseMap[camel] = snake;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = value;
  }
  return result;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(email: string, password: string): Promise<User> {
    const [user] = await db.insert(users).values({ email, password }).returning();
    return user;
  }

  async getProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles).where(isNull(profiles.deletedAt));
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile || undefined;
  }

  async getProfileByUserId(userId: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile || undefined;
  }

  async createProfile(data: any): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(data).returning();
    return profile;
  }

  async updateProfile(id: string, data: any): Promise<Profile | undefined> {
    const [profile] = await db.update(profiles).set({ ...data, updatedAt: new Date() }).where(eq(profiles.id, id)).returning();
    return profile || undefined;
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).where(isNull(clients.deletedAt)).orderBy(asc(clients.name));
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(data: any): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: any): Promise<Client | undefined> {
    const [client] = await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    return client || undefined;
  }

  async deleteClient(id: string): Promise<void> {
    await db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(asc(services.name));
  }

  async createService(data: any): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async queryTable(tableName: string, params: any = {}): Promise<any[]> {
    const table = TABLE_MAP[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    let query = db.select().from(table);
    const conditions: any[] = [];

    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        const col = (table as any)[key] || (table as any)[COLUMN_MAP[tableName]?.[key] || key];
        if (col) {
          if (value === null) {
            conditions.push(isNull(col));
          } else {
            conditions.push(eq(col, value as any));
          }
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as any;
    }

    if (params.orderBy) {
      const colName = COLUMN_MAP[tableName]?.[params.orderBy] || params.orderBy;
      const col = (table as any)[colName];
      if (col) {
        query = query.orderBy(params.ascending === false ? desc(col) : asc(col)) as any;
      }
    }

    if (params.limit) {
      query = query.limit(params.limit) as any;
    }

    const results = await query;
    return results;
  }

  async insertIntoTable(tableName: string, data: any): Promise<any> {
    const table = TABLE_MAP[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);
    const [result] = await db.insert(table).values(data).returning();
    return result;
  }

  async updateInTable(tableName: string, id: string, data: any): Promise<any> {
    const table = TABLE_MAP[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    if (data.updatedAt === undefined && (table as any).updatedAt) {
      data.updatedAt = new Date();
    }

    const idCol = (table as any).id || (table as any).userId;
    const [result] = await db.update(table).set(data).where(eq(idCol, id)).returning();
    return result;
  }

  async deleteFromTable(tableName: string, id: string): Promise<void> {
    const table = TABLE_MAP[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    if ((table as any).deletedAt) {
      await db.update(table).set({ deletedAt: new Date() } as any).where(eq((table as any).id, id));
    } else {
      await db.delete(table).where(eq((table as any).id, id));
    }
  }

  async upsertInTable(tableName: string, data: any, conflictField?: string): Promise<any> {
    const table = TABLE_MAP[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    const target = conflictField ? (table as any)[conflictField] : (table as any).id;
    const [result] = await db.insert(table).values(data)
      .onConflictDoUpdate({ target, set: data })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
