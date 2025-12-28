import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "./auth";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./utils";
import serverless from "serverless-http";
// @ts-ignore - CommonJS default export
import connectPgSimple from "connect-pg-simple";

const PostgresqlStore = connectPgSimple(session);

const app = express();
app.set("trust proxy", 1); // Trust first proxy (Render load balancer)

declare module 'http' {
    interface IncomingMessage {
        rawBody: unknown
    }
}

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    store: new PostgresqlStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        conObject: {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
        }
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

// Setup function to initialize routes
let serverlessHandler: any;

async function setupApp() {
    console.log("Initializing App Routes...");
    await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        throw err;
    });

    // Production mode - serve static files (if needed, though mostly API)
    serveStatic(app);
    return app;
}

// Export handler for Lambda
// Export handler for Lambda
let initError: any;

export const handler = async (event: any, context: any) => {
    if (initError) {
        console.error("Previous Init Error:", initError);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Previous Init Error",
                error: initError.message,
                stack: initError.stack
            })
        };
    }

    if (!serverlessHandler) {
        try {
            await setupApp();
            serverlessHandler = serverless(app, {
                binary: ['image/*', 'font/*', 'application/pdf', 'application/octet-stream', 'application/zip']
            });
        } catch (err: any) {
            console.error("Init failed:", err);
            initError = err;
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: "Init Failed",
                    error: err.message,
                    stack: err.stack
                })
            };
        }
    }
    return serverlessHandler(event, context);
};

// Local Development Start
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    (async () => {
        await setupApp();
        const port = parseInt(process.env.PORT || '5001', 10);
        app.listen(port, "0.0.0.0", () => {
            log(`serving on port ${port}`);
        });
    })();
}
