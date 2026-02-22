// server/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";

// server/vite.ts
import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const vite = await createViteServer({
    configFile: "vite.config.ts",
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        if (msg.includes("[TypeScript] Found 0 errors. Watching for file changes")) {
          log("no errors found", "tsc");
          return;
        }
        if (msg.includes("[TypeScript]")) {
          log(msg, "tsc");
          return;
        }
        viteLogger.error(msg, options);
      }
    }
  });
  app2.use(vite.middlewares);
  app2.use("{*path}", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/routes.ts
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// server/replit_integrations/object_storage/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

// server/replit_integrations/object_storage/objectAcl.ts
var ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}

// server/replit_integrations/object_storage/objectStorage.ts
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  // Gets the public object search paths.
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path2) => path2.trim()).filter((path2) => path2.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  // Gets the private object directory.
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  // Search for a public object from the search paths.
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  // Downloads an object to the response.
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path2) {
  if (!path2.startsWith("/")) {
    path2 = `/${path2}`;
  }
  const pathParts = path2.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/replit_integrations/object_storage/routes.ts
function registerObjectStorageRoutes(app2) {
  const objectStorageService = new ObjectStorageService();
  app2.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;
      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name"
        });
      }
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType }
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });
  app2.get("/objects/{*objectPath}", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

// server/routes.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
if (supabaseUrl && supabaseUrl.startsWith("//")) {
  supabaseUrl = "https:" + supabaseUrl;
} else if (supabaseUrl && !supabaseUrl.startsWith("http")) {
  supabaseUrl = "https://" + supabaseUrl;
}
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
var supabaseAdmin = null;
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
} catch (e) {
  console.error("Failed to initialize Supabase admin client:", e.message);
}
var ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || "";
var ALGORITHM = "aes-256-cbc";
function encryptPassword(password) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}
function decryptPassword(encryptedPassword) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const parts = encryptedPassword.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Supabase not configured" });
    return null;
  }
  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
  return user.id;
}
function registerRoutes(app2) {
  registerObjectStorageRoutes(app2);
  app2.get("/api/cron/check-overdue-reports", async (req, res) => {
    const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
    if (cronSecret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];
      const { data: assignments } = await supabaseAdmin.from("client_assignments").select("id, employee_id, client_id, service_id, clients(name)").eq("is_active", true);
      const { data: existingReports } = await supabaseAdmin.from("weekly_reports").select("employee_id, client_id, service_id").eq("week_start_date", weekStartStr);
      const reportedKeys = new Set((existingReports || []).map((r) => `${r.employee_id}:${r.client_id}:${r.service_id}`));
      const missingReports = (assignments || []).filter((a) => !reportedKeys.has(`${a.employee_id}:${a.client_id}:${a.service_id}`));
      const employeeMap = /* @__PURE__ */ new Map();
      for (const assignment of missingReports) {
        const empId = assignment.employee_id;
        const clientName = assignment.clients?.name || "Unknown Client";
        if (!employeeMap.has(empId)) employeeMap.set(empId, []);
        employeeMap.get(empId).push(clientName);
      }
      const notifications = [];
      for (const [employeeId, clientNames] of employeeMap.entries()) {
        notifications.push({
          user_id: employeeId,
          title: "Weekly Report Reminder",
          message: `You have pending reports for: ${clientNames.join(", ")}. Please submit them before the deadline.`,
          type: "warning",
          is_read: false,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (notifications.length > 0) {
        await supabaseAdmin.from("notifications").insert(notifications);
      }
      res.json({
        success: true,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        remindersSent: notifications.length,
        missingReports: missingReports.length
      });
    } catch (error) {
      console.error("Cron check-overdue error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/email/send", async (req, res) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const { to, subject, body, template_id } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "to, subject, and body are required" });
      }
      const { error: logError } = await supabaseAdmin.from("email_logs").insert({
        recipient_email: to,
        subject,
        body,
        template_id: template_id || null,
        sent_by: userId,
        status: "sent",
        sent_at: (/* @__PURE__ */ new Date()).toISOString(),
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (logError) {
        console.error("Email log error:", logError);
      }
      res.json({ success: true, message: "Email logged successfully" });
    } catch (error) {
      console.error("Email send error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/profile", async (req, res) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const { data: profile, error } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      if (profile) {
        return res.json(profile);
      }
      const { data: portalUser } = await supabaseAdmin.from("client_portal_users").select("*").eq("auth_user_id", userId).eq("is_active", true).maybeSingle();
      if (portalUser) {
        return res.json({ _portalUser: true, ...portalUser });
      }
      return res.status(404).json({ error: "No profile found. Please contact administrator." });
    } catch (error) {
      console.error("Profile endpoint error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/notifications/send", async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    try {
      const { userId, title, message, type = "info" } = req.body;
      if (!userId || !title || !message) {
        return res.status(400).json({ error: "userId, title, and message are required" });
      }
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/credentials/decrypt", async (req, res) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;
    try {
      const { encrypted_password } = req.body;
      if (!encrypted_password) {
        return res.status(400).json({ error: "Missing encrypted_password" });
      }
      const decrypted = decryptPassword(encrypted_password);
      res.json({ password: decrypted });
    } catch (error) {
      console.error("Decryption error:", error);
      res.status(500).json({ error: "Failed to decrypt password" });
    }
  });
  app2.post("/api/credentials/create", async (req, res) => {
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
      const { data, error } = await supabaseAdmin.from("client_credentials").insert({
        client_id,
        tool_name,
        username: username || null,
        encrypted_password: encrypted,
        notes: notes || null,
        created_by: userId
      }).select().single();
      if (error) throw error;
      res.json({ success: true, credential: data });
    } catch (error) {
      console.error("Credential creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/credentials/update", async (req, res) => {
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
      const updateData = {
        client_id,
        tool_name,
        username: username || null,
        notes: notes || null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (password) {
        updateData.encrypted_password = encryptPassword(password);
      }
      const { data, error } = await supabaseAdmin.from("client_credentials").update(updateData).eq("id", id).select().single();
      if (error) throw error;
      res.json({ success: true, credential: data });
    } catch (error) {
      console.error("Credential update error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/portal-users/create", async (req, res) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const { data: requestingUser } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (!requestingUser || requestingUser.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create portal users" });
      }
      const { email, password, full_name, client_id } = req.body;
      if (!email || !password || !full_name || !client_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, is_portal_user: true }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");
      const { error: portalError } = await supabaseAdmin.from("client_portal_users").insert({
        client_id,
        email,
        full_name,
        auth_user_id: authData.user.id,
        is_active: true
      });
      if (portalError) throw portalError;
      res.json({ success: true, user_id: authData.user.id });
    } catch (error) {
      console.error("Portal user creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/employees/create", async (req, res) => {
    const userId = await verifyAuth(req, res);
    if (!userId) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const { data: requestingUser } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (!requestingUser || requestingUser.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create employees" });
      }
      const { email, password, full_name, role, status, phone, max_capacity, skills, manager_id } = req.body;
      if (!email || !password || !full_name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        status: status || "active",
        phone: phone || null,
        max_capacity: parseInt(max_capacity) || 40,
        skills: skills || [],
        manager_id: manager_id || null
      });
      if (profileError) throw profileError;
      res.json({ success: true, user_id: authData.user.id });
    } catch (error) {
      console.error("Employee creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/reports/check-overdue", async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];
      const { data: assignments, error: assignErr } = await supabaseAdmin.from("client_assignments").select("id, employee_id, client_id, service_id, clients(name)").eq("is_active", true);
      if (assignErr) throw assignErr;
      const { data: existingReports, error: repErr } = await supabaseAdmin.from("weekly_reports").select("employee_id, client_id, service_id").eq("week_start_date", weekStartStr);
      if (repErr) throw repErr;
      const reportedKeys = new Set((existingReports || []).map((r) => `${r.employee_id}:${r.client_id}:${r.service_id}`));
      const missingReports = (assignments || []).filter((a) => !reportedKeys.has(`${a.employee_id}:${a.client_id}:${a.service_id}`));
      const employeeMap = /* @__PURE__ */ new Map();
      for (const assignment of missingReports) {
        const empId = assignment.employee_id;
        const clientName = assignment.clients?.name || "Unknown Client";
        if (!employeeMap.has(empId)) employeeMap.set(empId, []);
        employeeMap.get(empId).push(clientName);
      }
      const notifications = [];
      for (const [employeeId, clientNames] of employeeMap.entries()) {
        notifications.push({
          user_id: employeeId,
          title: "Weekly Report Reminder",
          message: `You have pending reports for: ${clientNames.join(", ")}. Please submit them before the deadline.`,
          type: "warning",
          is_read: false,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (notifications.length > 0) {
        const { error: notifErr } = await supabaseAdmin.from("notifications").insert(notifications);
        if (notifErr) throw notifErr;
      }
      res.json({
        success: true,
        remindersSent: notifications.length,
        missingReports: missingReports.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/reports/send-reminders", async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];
      const { data: assignments } = await supabaseAdmin.from("client_assignments").select("id, employee_id, client_id, service_id, clients(name)").eq("is_active", true);
      const { data: existingReports } = await supabaseAdmin.from("weekly_reports").select("employee_id, client_id, service_id").eq("week_start_date", weekStartStr);
      const reportedKeys = new Set((existingReports || []).map((r) => `${r.employee_id}:${r.client_id}:${r.service_id}`));
      const missingReports = (assignments || []).filter((a) => !reportedKeys.has(`${a.employee_id}:${a.client_id}:${a.service_id}`));
      const employeeMap = /* @__PURE__ */ new Map();
      for (const assignment of missingReports) {
        const empId = assignment.employee_id;
        const clientName = assignment.clients?.name || "Unknown Client";
        if (!employeeMap.has(empId)) employeeMap.set(empId, []);
        employeeMap.get(empId).push(clientName);
      }
      const notifications = [];
      for (const [employeeId, clientNames] of employeeMap.entries()) {
        notifications.push({
          user_id: employeeId,
          title: "Weekly Report Reminder",
          message: `You have pending reports for: ${clientNames.join(", ")}. Please submit them before the deadline.`,
          type: "warning",
          is_read: false,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (notifications.length > 0) {
        await supabaseAdmin.from("notifications").insert(notifications);
      }
      res.json({
        success: true,
        message: `Sent ${notifications.length} reminder notifications for ${missingReports.length} missing reports.`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/reports/status-summary", async (req, res) => {
    if (!await verifyAuth(req, res)) return;
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase not configured" });
      }
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + mondayOffset);
      currentWeekStart.setHours(0, 0, 0, 0);
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];
      const { data: reports, error } = await supabaseAdmin.from("weekly_reports").select("id, status, employee_id, client_id").eq("week_start_date", weekStartStr);
      if (error) throw error;
      const { count: totalAssignments } = await supabaseAdmin.from("client_assignments").select("id", { count: "exact", head: true }).eq("is_active", true);
      const statusCounts = {
        total_assignments: totalAssignments || 0,
        submitted: (reports || []).filter((r) => r.status === "submitted").length,
        approved: (reports || []).filter((r) => r.status === "approved").length,
        draft: (reports || []).filter((r) => r.status === "draft").length,
        pending: (totalAssignments || 0) - (reports || []).length
      };
      res.json(statusCounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      log(`${req.method} ${path2} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
(async () => {
  const server = createServer(app);
  registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
