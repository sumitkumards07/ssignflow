// server/index.prod.ts
import express2 from "express";
import session from "express-session";

// server/auth.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  tasks;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Map();
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "sumitkumar",
      password: "sk2007@",
      googleId: "admin_google_id",
      email: "admin@assignflow.com",
      displayName: "Sumit Kumar (Admin)",
      role: "admin"
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
  async createUser(insertUser) {
    const id = randomUUID();
    const user = {
      ...insertUser,
      id,
      googleId: insertUser.googleId ?? null,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null,
      role: insertUser.role ?? "user"
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
    return updatedTask;
  }
};
var storage = new MemStorage();

// server/auth.ts
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
var CALLBACK_URL = process.env.NODE_ENV === "production" ? "https://assignflow-exuc.onrender.com/api/auth/google/callback" : "http://localhost:5001/api/auth/google/callback";
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const displayName = profile.displayName || "";
        const photoUrl = profile.photos?.[0]?.value || "";
        let user = await storage.getUserByGoogleId(googleId);
        if (!user) {
          user = await storage.createUser({
            username: email.split("@")[0],
            password: "",
            // No password for OAuth users
            googleId,
            email,
            displayName,
            role: "user"
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
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

// shared/schema.ts
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
  role: text("role").default("user")
  // 'admin' | 'user'
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

// server/routes.ts
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
async function registerRoutes(app2) {
  app2.use("/api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app2.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app2.get(
    "/api/auth/google",
    auth_default.authenticate("google", { scope: ["profile", "email"] })
  );
  app2.get(
    "/api/auth/google/callback",
    auth_default.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      const isMobile = req.get("User-Agent")?.includes("CapacitorApp") || req.query.platform === "mobile";
      if (isMobile) {
        res.redirect(`assignflow://auth/callback?success=true&userId=${req.user?.id}`);
      } else {
        res.redirect("/");
      }
    }
  );
  app2.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
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
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/tasks", async (_req, res) => {
    try {
      const tasks2 = await storage.getTasks();
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
      const task = await storage.createTask(result.data);
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
  const upload = multer({ storage: multer.memoryStorage() });
  app2.post("/api/quiz/generate", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No PDF file uploaded" });
        return;
      }
      const dataBuffer = req.file.buffer;
      const { createRequire } = await import("module");
      const require2 = createRequire(import.meta.url);
      const pdfParse = require2("pdf-parse");
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
var app = express2();
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
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
