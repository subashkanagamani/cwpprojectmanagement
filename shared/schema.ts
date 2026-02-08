import { pgTable, text, uuid, boolean, date, timestamp, integer, numeric, jsonb, uniqueIndex, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"),
  status: text("status").notNull().default("active"),
  skills: jsonb("skills").default([]),
  maxCapacity: integer("max_capacity").default(5),
  phone: text("phone"),
  customFields: jsonb("custom_fields").default({}),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  industry: text("industry"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date").defaultNow(),
  notes: text("notes"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  priority: text("priority").default("medium"),
  healthStatus: text("health_status").default("healthy"),
  healthScore: numeric("health_score").default("100"),
  lastActivityDate: timestamp("last_activity_date"),
  customFields: jsonb("custom_fields").default({}),
  reportDueDay: integer("report_due_day").default(5),
  weeklyMeetingDay: integer("weekly_meeting_day"),
  meetingTime: text("meeting_time").default("10:00"),
  meetingReminderHours: integer("meeting_reminder_hours").default(24),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientServices = pgTable("client_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientAssignments = pgTable("client_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyReports = pgTable("weekly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  workSummary: text("work_summary"),
  status: text("status").notNull(),
  keyWins: text("key_wins"),
  challenges: text("challenges"),
  nextWeekPlan: text("next_week_plan"),
  approvalStatus: text("approval_status").default("draft"),
  isDraft: boolean("is_draft").default(false),
  lastAutoSaved: timestamp("last_auto_saved"),
  reportTemplateId: uuid("report_template_id"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceMetrics = pgTable("service_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  weeklyReportId: uuid("weekly_report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull(),
  metricData: jsonb("metric_data").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details").default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportApprovals = pgTable("report_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull().unique(),
  status: text("status").notNull().default("draft"),
  approverId: uuid("approver_id"),
  approvedAt: timestamp("approved_at"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportAttachments = pgTable("report_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type"),
  uploadedBy: uuid("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportComments = pgTable("report_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").notNull(),
  comment: text("comment").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportRevisions = pgTable("report_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").notNull(),
  data: jsonb("data").notNull(),
  changedBy: uuid("changed_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientBudgets = pgTable("client_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  monthlyBudget: numeric("monthly_budget", { precision: 12, scale: 2 }).notNull(),
  actualSpending: numeric("actual_spending", { precision: 10, scale: 2 }).default("0"),
  budgetUtilization: numeric("budget_utilization", { precision: 5, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientPortalUsers = pgTable("client_portal_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const performanceBenchmarks = pgTable("performance_benchmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  industry: text("industry").notNull(),
  metricName: text("metric_name").notNull(),
  benchmarkValue: numeric("benchmark_value", { precision: 12, scale: 2 }).notNull(),
  period: text("period").default("monthly"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customMetrics = pgTable("custom_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  metricName: text("metric_name").notNull(),
  metricType: text("metric_type").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportDrafts = pgTable("report_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  draftData: jsonb("draft_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityMetrics = pgTable("activity_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull(),
  metricType: text("metric_type").default("linkedin_outreach"),
  connectionsSent: integer("connections_sent").default(0),
  connectionsAccepted: integer("connections_accepted").default(0),
  responsesReceived: integer("responses_received").default(0),
  positiveResponses: integer("positive_responses").default(0),
  meetingsBooked: integer("meetings_booked").default(0),
  meetingDates: jsonb("meeting_dates").default([]),
  customMetricsData: jsonb("custom_metrics").default({}),
  metricName: text("metric_name"),
  metricValue: numeric("metric_value").default("0"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  templateData: jsonb("template_data").default({}),
  createdBy: uuid("created_by").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeTasks = pgTable("employee_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  priority: text("priority").default("medium"),
  status: text("status").default("pending"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const clientNotes = pgTable("client_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull(),
  clientId: uuid("client_id").notNull(),
  serviceId: uuid("service_id"),
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: text("description"),
  isBillable: boolean("is_billable").default(true),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"),
  isRead: boolean("is_read").default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgetAlerts = pgTable("budget_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientBudgetId: uuid("client_budget_id").references(() => clientBudgets.id, { onDelete: "cascade" }).notNull(),
  thresholdPercentage: integer("threshold_percentage").notNull(),
  alertSent: boolean("alert_sent").default(false),
  alertSentAt: timestamp("alert_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedDocuments = pgTable("shared_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  uploadedBy: uuid("uploaded_by").notNull(),
  description: text("description"),
  fileSize: integer("file_size").default(0),
  permissions: text("permissions").default("view"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportFeedback = pgTable("report_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => weeklyReports.id, { onDelete: "cascade" }).notNull(),
  portalUserId: uuid("portal_user_id").references(() => clientPortalUsers.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  createdBy: uuid("created_by"),
  clientId: uuid("client_id"),
  priority: text("priority").notNull().default("medium"),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  completedAt: timestamp("completed_at"),
  remarks: text("remarks"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientCredentials = pgTable("client_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  toolName: text("tool_name").notNull(),
  username: text("username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  notes: text("notes").default(""),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id"),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: numeric("target_value"),
  currentValue: numeric("current_value").default("0"),
  unit: text("unit"),
  startDate: date("start_date").notNull(),
  targetDate: date("target_date").notNull(),
  status: text("status").default("active"),
  priority: text("priority").default("medium"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goalProgress = pgTable("goal_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "cascade" }).notNull(),
  value: numeric("value").notNull(),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  direction: text("direction").notNull(),
  subject: text("subject"),
  summary: text("summary").notNull(),
  content: text("content"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetingNotes = pgTable("meeting_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  attendees: jsonb("attendees").default([]),
  agenda: text("agenda"),
  notes: text("notes").notNull(),
  actionItems: jsonb("action_items").default([]),
  nextMeeting: timestamp("next_meeting"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  clientId: uuid("client_id"),
  attendees: jsonb("attendees").default([]),
  location: text("location"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resourceAllocations = pgTable("resource_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  allocatedHours: numeric("allocated_hours", { precision: 5, scale: 2 }).notNull(),
  weekStart: date("week_start").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  templateType: text("template_type").notNull(),
  variables: jsonb("variables").default({}),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientHealthScores = pgTable("client_health_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull().unique(),
  score: numeric("score", { precision: 3, scale: 1 }).notNull(),
  factors: jsonb("factors").default({}),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  nextReviewDate: date("next_review_date"),
});

export const timesheets = pgTable("timesheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  weekStart: date("week_start").notNull(),
  status: text("status").default("draft"),
  totalHours: numeric("total_hours", { precision: 6, scale: 2 }).default("0"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const internalComments = pgTable("internal_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  userId: uuid("user_id").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const savedFilters = pgTable("saved_filters", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  filterName: text("filter_name").notNull(),
  page: text("page").notNull(),
  filterData: jsonb("filter_data").notNull(),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  theme: text("theme").default("light"),
  language: text("language").default("en"),
  timezone: text("timezone").default("UTC"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  timeFormat: text("time_format").default("12h"),
  itemsPerPage: integer("items_per_page").default(10),
  defaultView: text("default_view").default("list"),
  preferences: jsonb("preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  widgetType: text("widget_type").notNull(),
  position: integer("position").notNull(),
  size: text("size").default("medium"),
  config: jsonb("config").default({}),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id").primaryKey(),
  emailEnabled: boolean("email_enabled").default(true),
  emailDigest: text("email_digest").default("daily"),
  browserEnabled: boolean("browser_enabled").default(true),
  deadlineReminders: boolean("deadline_reminders").default(true),
  mentionNotifications: boolean("mention_notifications").default(true),
  approvalNotifications: boolean("approval_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  clientAssignments: many(clientAssignments),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  clientServices: many(clientServices),
  clientAssignments: many(clientAssignments),
  weeklyReports: many(weeklyReports),
  clientBudgets: many(clientBudgets),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  clientServices: many(clientServices),
  clientAssignments: many(clientAssignments),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Service = typeof services.$inferSelect;
export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type Task = typeof tasks.$inferSelect;
