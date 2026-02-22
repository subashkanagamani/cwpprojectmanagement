import type { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let supabaseAdmin: ReturnType<typeof createClient> | null = null;
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
} catch (e: any) {
  console.error("Failed to initialize Supabase admin client:", e.message);
}

// Encryption key for credentials - in production, use a secure key from environment
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'your-secret-key-at-least-32-chars-long-please-change';
const ALGORITHM = 'aes-256-cbc';

function encryptPassword(password: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPassword(encryptedPassword: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

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

      // Profile should have been auto-created by trigger, but if not, return error
      return res.status(404).json({ error: "No profile found. Please contact administrator." });
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

  // Decrypt credential password endpoint
  app.post("/api/credentials/decrypt", async (req: Request, res: Response) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    try {
      const { encrypted_password } = req.body;
      if (!encrypted_password) {
        return res.status(400).json({ error: "Missing encrypted_password" });
      }

      const decrypted = decryptPassword(encrypted_password);
      res.json({ password: decrypted });
    } catch (error: any) {
      console.error("Decryption error:", error);
      res.status(500).json({ error: "Failed to decrypt password" });
    }
  });

  // Create credential endpoint with server-side encryption
  app.post("/api/credentials/create", async (req: Request, res: Response) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const { client_id, tool_name, username, password, notes } = req.body;

      if (!client_id || !tool_name || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const encrypted = encryptPassword(password);

      const { data, error } = await (supabaseAdmin.from("client_credentials") as any).insert({
        client_id,
        tool_name,
        username: username || null,
        encrypted_password: encrypted,
        notes: notes || null,
        created_by: userId,
      }).select().single();

      if (error) throw error;

      res.json({ success: true, credential: data });
    } catch (error: any) {
      console.error("Credential creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update credential endpoint with server-side encryption
  app.post("/api/credentials/update", async (req: Request, res: Response) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const { id, client_id, tool_name, username, password, notes } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Missing credential ID" });
      }

      const updateData: any = {
        client_id,
        tool_name,
        username: username || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };

      if (password) {
        updateData.encrypted_password = encryptPassword(password);
      }

      const { data, error } = await (supabaseAdmin.from("client_credentials") as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, credential: data });
    } catch (error: any) {
      console.error("Credential update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create client portal user endpoint - uses admin auth to create user
  app.post("/api/portal-users/create", async (req: Request, res: Response) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      // Verify requesting user is admin
      const { data: requestingUser } = await (supabaseAdmin.from("profiles") as any)
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!requestingUser || requestingUser.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can create portal users" });
      }

      const { email, password, full_name, client_id } = req.body;

      if (!email || !password || !full_name || !client_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, is_portal_user: true }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create portal user record
      const { error: portalError } = await (supabaseAdmin.from("client_portal_users") as any).insert({
        client_id,
        email,
        full_name,
        auth_user_id: authData.user.id,
        is_active: true,
      });

      if (portalError) throw portalError;

      res.json({ success: true, user_id: authData.user.id });
    } catch (error: any) {
      console.error("Portal user creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create employee endpoint - uses admin auth to create user
  app.post("/api/employees/create", async (req: Request, res: Response) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      // Verify requesting user is admin
      const { data: requestingUser } = await (supabaseAdmin.from("profiles") as any)
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!requestingUser || requestingUser.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can create employees" });
      }

      const { email, password, full_name, role, status, phone, max_capacity, skills, manager_id } = req.body;

      if (!email || !password || !full_name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create profile (trigger should handle this, but we'll insert directly for reliability)
      const { error: profileError } = await (supabaseAdmin.from("profiles") as any).insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        status: status || 'active',
        phone: phone || null,
        max_capacity: parseInt(max_capacity) || 40,
        skills: skills || [],
        manager_id: manager_id || null,
      });

      if (profileError) throw profileError;

      res.json({ success: true, user_id: authData.user.id });
    } catch (error: any) {
      console.error("Employee creation error:", error);
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
