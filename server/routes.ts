import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "./auth";
import { storage } from "./storage";
import { insertTaskSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import multer from "multer";
import { callAI } from "./utils";
import { sendMulticastNotification } from "./firebase";
// pdf-parse is dynamically imported in the upload route to avoid loading it at server startup

// Profanity filter utility
function containsProfanity(text: string): boolean {
  const profanityList = [
    // Common offensive words (partial list - add more as needed)
    'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'bastard', 'crap',
    'dick', 'pussy', 'cock', 'slut', 'whore', 'fag', 'nigger', 'nigga',
    'retard', 'cunt', 'piss', 'asshole', 'motherfucker', 'bullshit',
    // Add variations and common bypasses
    'f*ck', 'sh*t', 'b*tch', 'a$$', 'fuk', 'fck', 'sht', 'btch',
    // Abusive terms
    'idiot', 'stupid', 'dumb', 'moron', 'loser', 'kill yourself', 'kys',
    'die', 'hate you', 'ugly', 'fat', 'worthless'
  ];

  const lowerText = text.toLowerCase();

  // Check for exact matches and word boundaries
  return profanityList.some(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerText) || lowerText.includes(word);
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers for mobile app
  app.use("/api", async (req, res, next) => {
    // Log API Key status once (or on every request for debugging)
    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not set!");
    }
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5001",
      "https://assignflow-exuc.onrender.com",
      "http://13.235.90.150",
      "capacitor://localhost",
      "http://localhost",
      "https://localhost",
      // AWS App Runner - add your App Runner URL here after deployment
    ];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    } else {
      // Fallback for mobile apps that might not send origin or send null
      // We default to the first allowed origin or just echo back if it looks like a mobile app
      res.header("Access-Control-Allow-Origin", origin || "http://localhost");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");

    // Token Authentication Middleware
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      if (user) {
        req.user = user;
      }
    }

    // Track user activity
    if (req.isAuthenticated() || req.user) {
      await storage.updateUserActivity((req.user as any).id);
    }

    // Log headers for debugging
    console.log(`[${req.method}] ${req.path}`);
    console.log("Origin:", req.headers.origin);
    console.log("Cookie:", req.headers.cookie ? "Present" : "Missing");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoints for AWS/container orchestration
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google OAuth routes removed
  // Local Auth Routes only

  app.get("/api/auth/me", (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Local Auth Routes
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        // Generate suggestions
        const suggestions = [
          `${username}${Math.floor(Math.random() * 1000)}`,
          `${username}_${new Date().getFullYear()}`,
          `${username}${Math.floor(Math.random() * 100)}`
        ];
        return res.status(400).json({
          message: "Username already exists",
          suggestions
        });
      }

      const user = await storage.createUser({
        username,
        password,
        role: "user",
        displayName: username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });

        // Explicitly save session before response
        req.session.save(async (err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ message: "Session save failed" });
          }
          return res.json(user);
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Explicitly save session before response
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json(req.user);
    });
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    const user = req.user as any;
    console.log(`Admin check for user: ${user?.username}, role: ${user?.role}`);

    if (!req.isAuthenticated() || (user.role !== "admin" && user.username !== "sumitkumar")) {
      console.log("Admin access denied");
      return res.status(403).json({ message: "Forbidden" });
    }
    const users = await storage.getAllUsers();
    const tasks = await storage.getAllTasks();

    const usersWithStats = users.map(user => {
      const userTasks = tasks.filter(t => t.userId === user.id);
      return {
        ...user,
        taskCount: userTasks.length,
        completedTaskCount: userTasks.filter(t => t.completed).length
      };
    });

    res.json(usersWithStats);
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks((req.user as any).id);
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to fetch tasks",
        error: "SERVER_ERROR"
      });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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
        userId: (req.user as any).id
      } as any);
      res.setHeader("Content-Type", "application/json");
      res.status(201).json({
        success: true,
        ...task
      });
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to create task",
        error: "SERVER_ERROR"
      });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
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
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to update task",
        error: "SERVER_ERROR"
      });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Task ID is required" });
        return;
      }

      await storage.deleteTask(id);
      res.sendStatus(204);
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({
        message: error.message || "Failed to delete task",
        error: "SERVER_ERROR"
      });
    }
  });

  // Feedback Routes
  app.post("/api/feedback", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const feedback = await storage.createFeedback({
        userId: (req.user as any).id,
        content
      });

      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/feedback", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const feedback = await storage.getAllFeedback();
    res.json(feedback);
  });

  // Analytics Routes
  app.post("/api/analytics/sync", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { totalTime, todayTime, date } = req.body;

    try {
      await storage.updateUserStats(
        (req.user as any).id,
        totalTime,
        todayTime,
        date
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      // Filter sensitive data
      const safeLeaderboard = leaderboard.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        totalFocusTime: u.totalFocusTime || 0,
        todayFocusTime: u.todayFocusTime || 0,
        lastFocusDate: u.lastFocusDate
      }));
      res.json(safeLeaderboard);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Group Routes
  app.post("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }
      const group = await storage.createGroup(name, (req.user as any).id);
      res.status(201).json(group);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Group code is required" });
      }
      const group = await storage.getGroupByCode(code);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      await storage.joinGroup(group.id, (req.user as any).id);
      res.json({ message: "Joined group successfully", group });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const groups = await storage.getUserGroups((req.user as any).id);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      const members = await storage.getGroupMembers(req.params.id);

      // Filter sensitive data
      const safeMembers = members.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        totalFocusTime: u.totalFocusTime || 0,
        todayFocusTime: u.todayFocusTime || 0,
        lastFocusDate: u.lastFocusDate
      }));

      res.json({ group, members: safeMembers });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Only creator or admin can delete
      if (group.createdBy !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Only the group creator can delete this group" });
      }

      await storage.deleteGroup(req.params.id);
      res.json({ message: "Group deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/groups/:id/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Only creator or admin can remove members
      if (group.createdBy !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Only the group creator can remove members" });
      }

      // Cannot remove the creator
      if (req.params.userId === group.createdBy) {
        return res.status(400).json({ message: "Cannot remove the group creator" });
      }

      await storage.removeGroupMember(req.params.id, req.params.userId);
      res.json({ message: "Member removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/tasks", async (req, res) => {
    const user = req.user as any;
    if (!req.isAuthenticated() || (user.role !== "admin" && user.username !== "sumitkumar")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const tasks = await storage.getAllTasks();
    res.json(tasks);
  });

  app.post("/api/admin/notifications", async (req, res) => {
    const user = req.user as any;
    if (!req.isAuthenticated() || (user.role !== "admin" && user.username !== "sumitkumar")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { title, body } = req.body;

    // Save to DB
    await storage.createNotification(title, body);

    // Send Push Notification (Broadcast)
    const users = await storage.getAllUsers();
    const tokens = users.map(u => u.pushToken).filter(t => t) as string[];

    if (tokens.length > 0) {
      try {
        await sendMulticastNotification(tokens, title, body);
      } catch (error) {
        console.error("Firebase notification error:", error);
        // Don't fail the request if push fails
      }
    }

    res.json({ success: true, message: "Notification created and queued for sending" });
  });

  // Register Push Token Route
  app.post("/api/notifications/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    // Update user with push token
    // We need to add updatePushToken to storage interface
    await storage.updatePushToken((req.user as any).id, token);
    res.json({ success: true });
  });

  app.post("/api/admin/updates", async (req, res) => {
    const user = req.user as any;
    if (!req.isAuthenticated() || (user.role !== "admin" && user.username !== "sumitkumar")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { versionCode, versionName, apkUrl, releaseNotes } = req.body;

    if (!versionCode || !versionName || !apkUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await storage.createAppVersion({
      versionCode: parseInt(versionCode),
      versionName,
      apkUrl,
      releaseNotes
    });

    // Send Push Notification about update
    const users = await storage.getAllUsers();
    const tokens = users.map(u => u.pushToken).filter(t => t) as string[];

    if (tokens.length > 0) {
      try {
        await sendMulticastNotification(tokens, "Update Available", `Version ${versionName} is now available.`);
      } catch (error) {
        console.error("Firebase update notification error:", error);
        // Don't fail the request if push fails
      }
    }

    res.json({ success: true });
  });

  app.get("/api/updates", async (req, res) => {
    const update = await storage.getLatestAppVersion();
    if (update) {
      res.json(update);
    } else {
      res.json({
        versionCode: 1,
        versionName: "1.0.0",
        apkUrl: "",
        releaseNotes: "No updates available"
      });
    }
  });

  // Admin Seeding is now handled in storage.seed() called from index.ts

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post("/api/quiz/generate", (req, res, next) => {
    upload.single("pdf")(req, res, (err) => {
      if (err) {
        console.error("Multer error in quiz:", err);
        return res.status(400).json({ message: "File upload failed: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No PDF file uploaded" });
        return;
      }

      const dataBuffer = req.file.buffer;

      // Dynamically import pdf-parse to avoid loading it at server startup
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      const pdfParse = require("pdf-parse");

      const data = await pdfParse(dataBuffer);
      const text = data.text;

      if (!text || text.length < 50) {
        res.status(400).json({ message: "Not enough text found in PDF" });
        return;
      }

      const prompt = `
        Generate a quiz with 5 multiple-choice questions based on the following text.
        Return the result as a JSON array of objects.
        Each object should have:
        - "question": string
        - "options": string[] (4 options)
        - "correctAnswer": string (the correct option text)
        
        Text: ${text.substring(0, 10000)}
      `;

      const responseText = await callAI(prompt);
      const quiz = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, "").trim());

      res.json(quiz);
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      const errorMessage = error.message?.toLowerCase() || "";
      if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("resource_exhausted")) {
        res.status(429).json({ message: "AI Quota Exceeded. Please try again later or update API Key." });
      } else {
        res.status(500).json({ message: "Failed to generate quiz: " + (error.message || "Unknown error") });
      }
    }
  });

  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ message: "Prompt is required" });
        return;
      }

      const systemPrompt = `
        You are an advanced AI Research Assistant. 
        Your goal is to provide comprehensive, accurate, and well-structured answers.
        
        Guidelines:
        - If the user asks a question, provide a detailed explanation.
        - If the user asks for a summary, provide a concise but complete summary.
        - Use formatting (bullet points, bold text) to make the answer readable.
        - If you don't know the answer, admit it and suggest what you do know.
        - Be helpful, polite, and professional.
      `;

      const text = await callAI(prompt, systemPrompt);

      res.json({ text });
    } catch (error: any) {
      console.error("AI generation error:", error);
      const errorMessage = error.message?.toLowerCase() || "";
      if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("resource_exhausted")) {
        res.status(429).json({ message: "AI Quota Exceeded. Please try again later or update API Key." });
      } else {
        res.status(500).json({ message: "Failed to generate content: " + (error.message || "Unknown error") });
      }
    }
  });


  // Health check route
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.1", timestamp: new Date().toISOString() });
  });

  app.post("/api/ai/analyze-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }

      const prompt = req.body.prompt || "Analyze this image and solve the problem shown. Provide step-by-step solution.";
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      const text = await callAI(prompt, undefined, imageBuffer, mimeType);
      res.json({ text });
    } catch (error: any) {
      console.error("Image analysis error:", error);
      // Return the actual error message for debugging
      res.status(500).json({ message: error.message || "Failed to analyze image" });
    }
  });

  app.post("/api/ai/pdf-to-notes", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      let text = "";

      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = req.file.buffer;
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else {
        // Handle image files for notes
        const prompt = "Transcribe these handwritten notes into clear, organized text notes. Use markdown formatting.";
        text = await callAI(prompt, undefined, req.file.buffer, req.file.mimetype);
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Could not extract text from file" });
      }

      // Generate summary/notes from the text
      const prompt = `Create comprehensive study notes from the following text. 
      Format with clear headings, bullet points, and key concepts.
      
      Text:
      ${text.slice(0, 15000)}`; // Limit text length for API

      const notes = await callAI(prompt);

      // Return 'notes' field as expected by client
      res.json({ notes });
    } catch (error: any) {
      console.error("Notes generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate notes" });
    }
  });

  // PDF/Image to Timetable Route
  app.post("/api/ai/pdf-to-timetable", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload failed: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const mode = req.body.mode;
      const topicsPerDay = req.body.topicsPerDay || "2";
      const studyTime = req.body.studyTime || "10:00";

      let promptText = "";
      if (mode === "syllabus") {
        promptText = `
            Create a study schedule from the following syllabus content.
            The user wants to study ${topicsPerDay} topics per day starting at ${studyTime}.
            Start from tomorrow.
            Return a JSON array of objects with:
            - "day": string (e.g., "Monday", "2023-10-27")
            - "time": string (e.g., "${studyTime} - [End Time]")
            - "subject": string (Course Name)
            - "task": string (Topic to study)
          `;
      } else {
        promptText = `
            Extract a study timetable or schedule from the following content.
            Return a JSON array of objects with:
            - "day": string (e.g., "Monday", "2023-10-27")
            - "time": string (e.g., "10:00 AM - 11:00 AM")
            - "subject": string
            - "task": string
            
            If NO explicit schedule (dates/times) is found, return exactly this JSON:
            {"error": "no_schedule_found", "mode": "syllabus_required"}
          `;
      }

      let responseText = "";
      if (req.file.mimetype === "application/pdf") {
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(req.file.buffer);
        responseText = await callAI(promptText + "\n\nContent:\n" + data.text.substring(0, 20000));
      } else {
        responseText = await callAI(promptText, undefined, req.file.buffer, req.file.mimetype);
      }

      const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const timetable = JSON.parse(jsonString);

      res.json(timetable);
    } catch (error: any) {
      console.error("File to timetable error:", error);
      res.status(500).json({ message: "Failed to generate timetable" });
    }
  });



  // AI Attendance Route
  app.post("/api/ai/attendance", async (req, res) => {
    try {
      const { present, totalConducted, upcoming, required } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        res.status(500).json({ message: "AI API Key not configured" });
        return;
      }

      // Hardcoded Math Logic to prevent AI hallucinations
      const p = parseInt(present);
      const t = parseInt(totalConducted);
      const u = parseInt(upcoming);
      const r = parseInt(required);

      const totalClasses = t + u;
      const requiredClasses = Math.ceil((totalClasses * r) / 100);
      const deficit = requiredClasses - p;

      const mustAttend = Math.max(0, deficit);
      const canBunk = Math.max(0, u - mustAttend);
      const currentPercentage = ((p / t) * 100).toFixed(2);
      const maxPossiblePercentage = (((p + u) / totalClasses) * 100).toFixed(2);

      let status = "";
      if (mustAttend > u) {
        status = `Even if you attend ALL ${u} upcoming classes, you will only reach ${maxPossiblePercentage}%. You cannot reach ${r}%.`;
      } else if (mustAttend > 0) {
        status = `You MUST attend ${mustAttend} out of ${u} upcoming classes to reach ${r}%. You can bunk ${canBunk}.`;
      } else {
        status = `You are safe! You can bunk ${canBunk} upcoming classes and still stay above ${r}%.`;
      }

      const prompt = `
        The user wants to know their attendance status.
        Here is the mathematically correct data:
        - Current Percentage: ${currentPercentage}%
        - Target Percentage: ${r}%
        - Upcoming Classes: ${u}
        - Must Attend: ${mustAttend}
        - Can Bunk: ${canBunk}
        - Status Summary: "${status}"
        
        Task:
        Rewrite the "Status Summary" in a fun, student-friendly way.
        Keep it extremely short and concise.
        Use bullet points.
        Use emojis.
        Keep the numbers EXACTLY as provided. Do NOT recalculate.
        
        Return JSON: { "analysis": "Your short bulleted response here" }
      `;

      const responseText = await callAI(prompt);

      // Extract JSON if needed
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const json = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: responseText };

      res.json(json);
    } catch (error: any) {
      console.error("AI Attendance error:", error);
      res.status(500).json({ message: "Failed to analyze attendance" });
    }
  });

  // YouTube Playlist Route
  app.get("/api/youtube/playlist", async (req, res) => {
    try {
      const { listId } = req.query;
      if (!listId) {
        res.status(400).json({ message: "Playlist ID is required" });
        return;
      }

      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        // Fallback or error if no key. For now, error.
        res.status(500).json({ message: "YouTube API Key not configured" });
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${listId}&key=${apiKey}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("YouTube API Error:", JSON.stringify(errorData, null, 2));

        if (response.status === 403) {
          return res.status(403).json({ message: "YouTube API Quota Exceeded or Invalid Key" });
        }
        if (response.status === 404) {
          return res.status(404).json({ message: "Playlist not found" });
        }

        throw new Error(errorData.error?.message || "Failed to fetch playlist");
      }

      const data = await response.json();

      const videoIds = data.items.map((item: any) => item.snippet.resourceId.videoId).join(",");

      // Fetch video details (duration)
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
      );

      if (!videosResponse.ok) {
        throw new Error("Failed to fetch video details");
      }

      const videosData = await videosResponse.json();
      const durationMap = new Map(
        videosData.items.map((item: any) => [item.id, item.contentDetails.duration])
      );

      const videos = data.items.map((item: any) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.default?.url || "",
        position: item.snippet.position,
        duration: durationMap.get(item.snippet.resourceId.videoId) || "PT0M"
      }));

      res.json(videos);
    } catch (error: any) {
      console.error("YouTube playlist error:", error);
      res.status(500).json({ message: error.message || "Internal Server Error" });
    }
  });

  // Temporary route to promote admin
  app.post("/api/admin/promote-temp", async (req, res) => {
    try {
      const { username, secret } = req.body;
      if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Direct DB update to bypass storage interface if needed, or add method to storage
      // For now, we'll assume we can use a raw query or just add a method to storage.
      // But wait, storage interface doesn't have updateUserRole.
      // Let's add it to storage.ts first or just use db directly here if we import it.
      // Importing db directly in routes is fine for this temp fix.

      // Actually, let's just use a raw SQL query via db if possible, or add to storage.
      // Adding to storage is cleaner.
      await storage.updateUserRole(user.id, "admin");

      res.json({ message: `User ${username} promoted to admin` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clash/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const groupId = req.query.groupId as string;
    if (!groupId) return res.status(400).json({ message: "Group ID is required" });

    // Check if user is member of this group
    const members = await storage.getGroupMembers(groupId);
    const isMember = members.some(m => m.id === (req.user as any).id);
    if (!isMember) return res.status(403).json({ message: "Not a member of this group" });

    const messages = await storage.getClashMessages(groupId);
    res.json(messages);
  });

  app.post("/api/clash/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { content, groupId } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });
    if (!groupId) return res.status(400).json({ message: "Group ID is required" });

    // Check for profanity
    if (containsProfanity(content)) {
      return res.status(400).json({ message: "Message contains inappropriate language. Please keep the chat respectful." });
    }

    // Check if user is member of this group
    const members = await storage.getGroupMembers(groupId);
    const isMember = members.some(m => m.id === (req.user as any).id);
    if (!isMember) return res.status(403).json({ message: "Not a member of this group" });

    const message = await storage.createClashMessage((req.user as any).id, content, groupId);
    res.json(message);
  });

  app.post("/api/user/settings/clash-notifications", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ message: "Enabled must be a boolean" });

    await storage.toggleClashNotifications((req.user as any).id, enabled);
    res.json({ success: true });
  });

  app.delete("/api/groups/:groupId/members/:userId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { groupId, userId } = req.params;

    const group = await storage.getGroup(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only creator can remove members
    if (group.createdBy !== (req.user as any).id) {
      return res.status(403).json({ message: "Only the group admin can remove members" });
    }

    // Cannot remove self (use leave group instead)
    if (userId === (req.user as any).id) {
      return res.status(400).json({ message: "Cannot remove yourself" });
    }

    await storage.removeGroupMember(groupId, userId);
    res.sendStatus(200);
  });

  const httpServer = createServer(app);

  return httpServer;
}
