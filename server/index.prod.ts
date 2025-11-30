import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "./auth";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./utils";

const app = express();
app.set("trust proxy", 1); // Trust first proxy (Render load balancer)

declare module 'http' {
    interface IncomingMessage {
        rawBody: unknown
    }
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PostgresqlStore = require("connect-pg-simple")(session);

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    store: new PostgresqlStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "none", // Important for mobile
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
    strict: true
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

(async () => {
    console.log("Starting PRODUCTION server with Admin Promotion Route...");
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(status).json({ message });
        throw err;
    });

    // Production mode - serve static files
    serveStatic(app);

    const port = parseInt(process.env.PORT || '5001', 10);
    server.listen({
        port,
        host: "0.0.0.0",
    }, () => {
        log(`serving on port ${port}`);
    });
})();
