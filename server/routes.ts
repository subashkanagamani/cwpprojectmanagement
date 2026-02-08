import type { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function verifyAuth(req: Request, res: Response): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: "Supabase not configured" });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  return user.id;
}

export function registerRoutes(app: Express) {
  // Profile endpoint - bypasses RLS using service key
  app.get("/api/profile", async (req: Request, res: Response) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const { data: profile, error } = await (supabaseAdmin
        .from("profiles") as any)
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        return res.json(profile);
      }

      // Check portal users
      const { data: portalUser } = await (supabaseAdmin
        .from("client_portal_users") as any)
        .select("*")
        .eq("auth_user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (portalUser) {
        return res.json({ _portalUser: true, ...portalUser });
      }

      // Auto-create profile for new users
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(
        req.headers.authorization!.split(' ')[1]
      );

      if (authUser) {
        const newProfile = {
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role: 'admin',
          status: 'active',
          skills: [],
          max_capacity: 40,
          phone: null,
          custom_fields: {},
        };

        const { data: created, error: createErr } = await (supabaseAdmin
          .from("profiles") as any)
          .insert(newProfile)
          .select()
          .single();

        if (createErr) {
          console.error("Error creating profile:", createErr.message);
          return res.json(newProfile);
        }
        return res.json(created);
      }

      return res.status(404).json({ error: "No profile found" });
    } catch (error: any) {
      console.error("Profile endpoint error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/send", async (req: Request, res: Response) => {
    if (!(await verifyAuth(req, res))) return;
    try {
      const { userId, title, message, type = "info" } = req.body;
      if (!userId || !title || !message) {
        return res.status(400).json({ error: "userId, title, and message are required" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const { error } = await (supabaseAdmin.from("notifications") as any).insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports/check-overdue", async (req: Request, res: Response) => {
    if (!(await verifyAuth(req, res))) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];

      const { data: assignments, error: assignErr } = await (supabaseAdmin
        .from("client_assignments") as any)
        .select("id, employee_id, client_id, clients(name)")
        .eq("is_active", true);

      if (assignErr) throw assignErr;

      const { data: existingReports, error: repErr } = await (supabaseAdmin
        .from("weekly_reports") as any)
        .select("assignment_id")
        .eq("week_start_date", weekStartStr);

      if (repErr) throw repErr;

      const reportedAssignments = new Set((existingReports || []).map((r: any) => r.assignment_id));
      const missingReports = (assignments || []).filter((a: any) => !reportedAssignments.has(a.id));

      const employeeMap = new Map<string, string[]>();
      for (const assignment of missingReports) {
        const empId = assignment.employee_id;
        const clientName = assignment.clients?.name || "Unknown Client";
        if (!employeeMap.has(empId)) employeeMap.set(empId, []);
        employeeMap.get(empId)!.push(clientName);
      }

      const notifications: any[] = [];
      for (const [employeeId, clientNames] of employeeMap.entries()) {
        notifications.push({
          user_id: employeeId,
          title: "Weekly Report Reminder",
          message: `You have pending reports for: ${clientNames.join(", ")}. Please submit them before the deadline.`,
          type: "warning",
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      if (notifications.length > 0) {
        const { error: notifErr } = await (supabaseAdmin.from("notifications") as any).insert(notifications);
        if (notifErr) throw notifErr;
      }

      res.json({
        success: true,
        remindersSent: notifications.length,
        missingReports: missingReports.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports/send-reminders", async (req: Request, res: Response) => {
    if (!(await verifyAuth(req, res))) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];

      const { data: assignments } = await (supabaseAdmin
        .from("client_assignments") as any)
        .select("id, employee_id, client_id, clients(name)")
        .eq("is_active", true);

      const { data: existingReports } = await (supabaseAdmin
        .from("weekly_reports") as any)
        .select("assignment_id")
        .eq("week_start_date", weekStartStr);

      const reportedAssignments = new Set((existingReports || []).map((r: any) => r.assignment_id));
      const missingReports = (assignments || []).filter((a: any) => !reportedAssignments.has(a.id));

      const employeeMap = new Map<string, string[]>();
      for (const assignment of missingReports) {
        const empId = assignment.employee_id;
        const clientName = assignment.clients?.name || "Unknown Client";
        if (!employeeMap.has(empId)) employeeMap.set(empId, []);
        employeeMap.get(empId)!.push(clientName);
      }

      const notifications: any[] = [];
      for (const [employeeId, clientNames] of employeeMap.entries()) {
        notifications.push({
          user_id: employeeId,
          title: "Weekly Report Reminder",
          message: `You have pending reports for: ${clientNames.join(", ")}. Please submit them before the deadline.`,
          type: "warning",
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      if (notifications.length > 0) {
        await (supabaseAdmin.from("notifications") as any).insert(notifications);
      }

      res.json({
        success: true,
        message: `Sent ${notifications.length} reminder notifications for ${missingReports.length} missing reports.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/status-summary", async (req: Request, res: Response) => {
    if (!(await verifyAuth(req, res))) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];

      const { data: reports, error } = await (supabaseAdmin
        .from("weekly_reports") as any)
        .select("id, status, assignment_id")
        .eq("week_start_date", weekStartStr);

      if (error) throw error;

      const { count: totalAssignments } = await (supabaseAdmin
        .from("client_assignments") as any)
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      const statusCounts = {
        total_assignments: totalAssignments || 0,
        submitted: (reports || []).filter((r: any) => r.status === "submitted").length,
        approved: (reports || []).filter((r: any) => r.status === "approved").length,
        draft: (reports || []).filter((r: any) => r.status === "draft").length,
        pending: (totalAssignments || 0) - (reports || []).length,
      };

      res.json(statusCounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
