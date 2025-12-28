import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "./auth";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { startWorker } from "./worker";

import { log } from "./utils";
import path from "path";
import fs from "fs";
// Imports cleaned up
import { serveStatic } from "./utils"; // Import the one from utils which uses process.cwd()
import pgSession from "connect-pg-simple";
import serverless from "serverless-http";
import { setupWebSocket } from "./ws-server";

// Export app for Lambda
export const app = express();
app.set("trust proxy", 1); // Trust first proxy (Render/Cloudflare)

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Session middleware
const isDatabaseAvailable = process.env.DATABASE_URL && process.env.DATABASE_URL !== "your_database_url";
const store = isDatabaseAvailable
  ? new (pgSession(session))({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
  })
  : new session.MemoryStore();

if (!isDatabaseAvailable) {
  console.warn("WARNING: DATABASE_URL not configured. Using MemoryStore for sessions. Data will not persist.");
}

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CORS Middleware - Allow all origins for mobile app support
app.use((req, res, next) => {
  // Allow all origins for mobile app support
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // For requests without origin (like direct API calls), allow all
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
  strict: true,
  limit: "50mb" // Increase limit for large AI prompts
}));

// Error handler for JSON parsing
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error("JSON parsing error:", err);
    res.status(400).json({
      message: "Invalid JSON in request body",
      error: err.message
    });
    return;
  }
  next(err);
});
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export async function initApp(startListening = true) {
  try {
    await storage.seed();
  } catch (err) {
    console.warn("Seeding failed (non-critical):", err);
  }

  const server = await registerRoutes(app);

  // Setup WebSocket Server
  setupWebSocket(server);

  // Start background worker
  if (process.env.NODE_ENV !== "test") {
    startWorker();
  }

  // Schedule daily cleanup of old messages (7 days retention)
  setInterval(async () => {
    try {
      await storage.cleanupOldMessages();
      console.log("Cleaned up old chat messages");
    } catch (error) {
      console.error("Failed to cleanup old messages:", error);
    }
  }, 24 * 60 * 60 * 1000); // Run every 24 hours

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  /*
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  */
  serveStatic(app);

  // Only start listening if requested (not in Lambda)
  if (startListening) {
    const port = parseInt(process.env.PORT || '5001', 10);
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });
  }

  return { app, server };
}

// Start immediately if not imported module or simple dev check
// Start immediately if not imported module or simple dev check
if (process.env.NODE_ENV !== "lambda" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // Check if we should autostart? 
  // For now, always start unless NODE_ENV=lambda
  (async () => {
    await initApp(true);
  })();
}

// server.listen done above in initApp if needed

// server.listen done above in initApp if needed

// server.listen done above in initApp if needed

let lambdaHandler: any;
let initError: any;

export const handler = async (event: any, context: any) => {
  if (initError) {
    console.error("Previous Init Error:", initError);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Previous Init Error", error: initError.message, stack: initError.stack })
    };
  }

  if (!lambdaHandler) {
    try {
      await initApp(false); // Initialize routes, but do not listen
      lambdaHandler = serverless(app);
    } catch (err: any) {
      console.error("Init failed:", err);
      initError = err;
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Init Failed", error: err.message, stack: err.stack })
      };
    }
  }
  return lambdaHandler(event, context);
};

