var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.prod.ts
import "dotenv/config";
import express2 from "express";
import session from "express-session";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  feedback: () => feedback,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  tasks: () => tasks,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  googleId: text("google_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  role: text("role").default("user"),
  // 'admin' | 'user'
  lastActive: text("last_active"),
  // ISO string timestamp
  apiToken: text("api_token").unique()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  googleId: true,
  email: true,
  displayName: true,
  role: true
});
var tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(),
  // 'assignment' | 'quiz'
  title: text("title").notNull(),
  courseCode: text("course_code").notNull(),
  sectionId: text("section_id").notNull(),
  deadline: text("deadline").notNull(),
  // Storing as ISO string for simplicity
  completed: boolean("completed").notNull().default(false),
  notificationTime: integer("notification_time").default(24 * 60)
  // Minutes before deadline, default 24h
});
var insertTaskSchema = createInsertSchema(tasks).pick({
  userId: true,
  type: true,
  title: true,
  courseCode: true,
  sectionId: true,
  deadline: true,
  completed: true,
  notificationTime: true
});
var feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: text("created_at").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertFeedbackSchema = createInsertSchema(feedback).pick({
  userId: true,
  content: true
});

// server/storage.ts
import { randomUUID } from "crypto";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var MemStorage = class {
  users;
  tasks;
  feedback;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Map();
    this.feedback = /* @__PURE__ */ new Map();
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "sumitkumar",
      password: "sk2007@",
      googleId: "admin_google_id",
      email: "admin@assignflow.com",
      displayName: "Sumit Kumar (Admin)",
      role: "admin",
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      apiToken: "admin_token"
    });
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserByGoogleId(googleId) {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId
    );
  }
  async getUserByToken(token) {
    return Array.from(this.users.values()).find(
      (user) => user.apiToken === token
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = {
      ...insertUser,
      id,
      googleId: insertUser.googleId ?? null,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null,
      role: insertUser.role ?? "user",
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      apiToken: randomUUID()
    };
    this.users.set(id, user);
    return user;
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async getTasks(userId) {
    const allTasks = Array.from(this.tasks.values());
    if (userId) {
      return allTasks.filter((task) => task.userId === userId);
    }
    return allTasks;
  }
  async getAllTasks() {
    return Array.from(this.tasks.values());
  }
  async createTask(insertTask) {
    const id = randomUUID();
    const task = {
      ...insertTask,
      id,
      userId: insertTask.userId ?? null,
      completed: insertTask.completed ?? false,
      notificationTime: insertTask.notificationTime ?? 1440
      // Default 24h
    };
    this.tasks.set(id, task);
    return task;
  }
  async updateTask(id, updateData) {
    const task = this.tasks.get(id);
    if (!task) return void 0;
    const updatedTask = { ...task, ...updateData };
    this.tasks.set(id, updatedTask);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  async deleteTask(id) {
    this.tasks.delete(id);
  }
  async createFeedback(insertFeedback) {
    const id = randomUUID();
    const newFeedback = {
      id,
      userId: insertFeedback.userId ?? null,
      content: insertFeedback.content,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.feedback.set(id, newFeedback);
    return newFeedback;
  }
  async getAllFeedback() {
    return Array.from(this.feedback.values());
  }
  async updateUserActivity(userId) {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, lastActive: (/* @__PURE__ */ new Date()).toISOString() };
      this.users.set(userId, updatedUser);
    }
  }
  async updateUserRole(userId, role) {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, role };
      this.users.set(userId, updatedUser);
    }
  }
};
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByGoogleId(googleId) {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }
  async getUserByToken(token) {
    const [user] = await db.select().from(users).where(eq(users.apiToken, token));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values({
      ...insertUser,
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      apiToken: randomUUID()
    }).returning();
    return user;
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  async getTasks(userId) {
    if (userId) {
      return await db.select().from(tasks).where(eq(tasks.userId, userId));
    }
    return await db.select().from(tasks);
  }
  async getAllTasks() {
    return await db.select().from(tasks);
  }
  async createTask(insertTask) {
    const [task] = await db.insert(tasks).values({
      ...insertTask,
      completed: insertTask.completed ?? false,
      notificationTime: insertTask.notificationTime ?? 1440
    }).returning();
    return task;
  }
  async updateTask(id, updateData) {
    const [task] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return task;
  }
  async deleteTask(id) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  async createFeedback(insertFeedback) {
    const [newFeedback] = await db.insert(feedback).values({
      ...insertFeedback,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }).returning();
    return newFeedback;
  }
  async getAllFeedback() {
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }
  async updateUserActivity(userId) {
    await db.update(users).set({ lastActive: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(users.id, userId));
  }
  async updateUserRole(userId, role) {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }
};
var storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

// server/auth.ts
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      if (user.password !== password) {
        return done(null, false, { message: "Incorrect password." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
var auth_default = passport;

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
async function registerRoutes(app2) {
  app2.use("/api", async (req, res, next) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5001",
      "https://assignflow-exuc.onrender.com",
      "capacitor://localhost",
      "http://localhost"
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    } else {
      res.header("Access-Control-Allow-Origin", origin || "http://localhost");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      if (user) {
        req.user = user;
      }
    }
    if (req.isAuthenticated() || req.user) {
      await storage.updateUserActivity(req.user.id);
    }
    console.log(`[${req.method}] ${req.path}`);
    console.log("Origin:", req.headers.origin);
    console.log("Cookie:", req.headers.cookie ? "Present" : "Missing");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app2.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app2.get("/api/auth/me", (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err2) => {
        if (err2) console.error("Session destroy error:", err2);
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser({
        username,
        password,
        role: "user",
        displayName: username
      });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        req.session.save(async (err2) => {
          if (err2) {
            console.error("Session save error:", err2);
            return res.status(500).json({ message: "Session save failed" });
          }
          return res.json(user);
        });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/login", auth_default.authenticate("local"), (req, res) => {
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json(req.user);
    });
  });
  app2.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const users2 = await storage.getAllUsers();
    const tasks2 = await storage.getAllTasks();
    const usersWithStats = users2.map((user) => {
      const userTasks = tasks2.filter((t) => t.userId === user.id);
      return {
        ...user,
        taskCount: userTasks.length,
        completedTaskCount: userTasks.filter((t) => t.completed).length
      };
    });
    res.json(usersWithStats);
  });
  app2.get("/api/tasks", async (req, res) => {
    try {
      const tasks2 = await storage.getTasks(req.user.id);
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(tasks2);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to fetch tasks",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const result = insertTaskSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          message: "Invalid request data",
          errors: result.error.errors
        });
        return;
      }
      const task = await storage.createTask({
        ...result.data,
        userId: req.user.id
      });
      res.setHeader("Content-Type", "application/json");
      res.status(201).json({
        success: true,
        ...task
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to create task",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Task ID is required" });
        return;
      }
      const updatedTask = await storage.updateTask(id, req.body);
      if (!updatedTask) {
        res.setHeader("Content-Type", "application/json");
        res.status(404).json({
          message: "Task not found",
          error: "NOT_FOUND"
        });
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        ...updatedTask
      });
    } catch (error) {
      console.error("Error updating task:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to update task",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Task ID is required" });
        return;
      }
      await storage.deleteTask(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({
        message: error.message || "Failed to delete task",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.post("/api/feedback", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      const feedback2 = await storage.createFeedback({
        userId: req.user.id,
        content
      });
      res.status(201).json(feedback2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/feedback", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const feedback2 = await storage.getAllFeedback();
    res.json(feedback2);
  });
  const upload = multer({ storage: multer.memoryStorage() });
  app2.post("/api/quiz/generate", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No PDF file uploaded" });
        return;
      }
      const dataBuffer = req.file.buffer;
      const { createRequire: createRequire2 } = await import("module");
      const require3 = createRequire2(import.meta.url);
      const pdfParse = require3("pdf-parse");
      const data = await pdfParse(dataBuffer);
      const text2 = data.text;
      if (!text2 || text2.length < 50) {
        res.status(400).json({ message: "Not enough text found in PDF" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `
        Generate a quiz with 5 multiple-choice questions based on the following text.
        Return the result as a JSON array of objects.
        Each object should have:
        - "question": string
        - "options": string[] (4 options)
        - "correctAnswer": string (the correct option text)
        
        Text: ${text2.substring(0, 1e4)}
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const quiz = JSON.parse(response.text().replace(/```json/g, "").replace(/```/g, "").trim());
      res.json(quiz);
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });
  app2.post("/api/admin/promote-temp", async (req, res) => {
    try {
      const { username, secret } = req.body;
      if (secret !== "temp-secret-123") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.updateUserRole(user.id, "admin");
      res.json({ message: `User ${username} promoted to admin` });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/utils.ts
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname, "public");
  console.log("Serving static files from:", distPath);
  console.log("Current directory:", __dirname);
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.prod.ts
import { createRequire } from "module";
var app = express2();
app.set("trust proxy", 1);
var require2 = createRequire(import.meta.url);
var PostgresqlStore = require2("connect-pg-simple")(session);
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  store: new PostgresqlStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    // Important for mobile
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use(auth_default.initialize());
app.use(auth_default.session());
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
  strict: true
}));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.error("JSON parsing error:", err);
    res.status(400).json({
      message: "Invalid JSON in request body",
      error: err.message
    });
    return;
  }
  next(err);
});
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  console.log("Starting PRODUCTION server with Admin Promotion Route...");
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  serveStatic(app);
  const port = parseInt(process.env.PORT || "5001", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
