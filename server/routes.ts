import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "./auth";
import { storage } from "./storage";
import { insertTaskSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
// pdf-parse is dynamically imported in the upload route to avoid loading it at server startup

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers for mobile app
  app.use("/api", async (req, res, next) => {
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
      // Fallback for mobile apps that might not send origin or send null
      // We default to the first allowed origin or just echo back if it looks like a mobile app
      res.header("Access-Control-Allow-Origin", origin || "http://localhost");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");

    // Track user activity
    if (req.isAuthenticated() && req.user) {
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

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Google OAuth routes removed
  // Local Auth Routes only

  app.get("/api/auth/me", (req, res) => {
    console.log("Session ID:", req.sessionID);
    console.log("User:", req.user);
    console.log("Is Authenticated:", req.isAuthenticated());

    if (req.isAuthenticated()) {
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
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password,
        role: "user",
        displayName: username,
      });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });

        // Explicitly save session before response
        req.session.save((err) => {
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
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get("/api/tasks", async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
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

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/quiz/generate", upload.single("pdf"), async (req, res) => {
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
        
        Text: ${text.substring(0, 10000)}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const quiz = JSON.parse(response.text().replace(/```json/g, "").replace(/```/g, "").trim());

      res.json(quiz);
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
