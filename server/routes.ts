import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers for mobile app
  app.use("/api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
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
