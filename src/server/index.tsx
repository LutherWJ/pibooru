import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger as honoLogger } from "hono/logger";
import { csrf } from "hono/csrf";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { CONFIG } from "./util/config";
import { PATHS } from "./util/paths";
import { initDb } from "./db";
import { authMiddleware } from "./middleware/auth";
import { renderer } from "./middleware/renderer";
import { logger } from "./util/logger";
import type { AppEnv } from "./types";

// Route modules
import { systemRouter } from "./routes/system";
import { mediaRouter } from "./routes/media";
import { authRouter } from "./routes/auth";
import { settingsRouter } from "./routes/settings";
import { viewerRouter } from "./routes/viewer";
import { postRouter } from "./routes/posts";
import { tagRouter } from "./routes/tags";
import { uploadRouter } from "./routes/upload";

// Log system paths for debugging
logger.info({
    domain: "SYSTEM",
    root: PATHS.ROOT,
    data: PATHS.DATA,
    migrations: PATHS.MIGRATIONS,
}, "System paths resolved");

// Initialize Database
logger.info({ domain: "SYSTEM" }, "Initializing PiBooru...");
await initDb();

export const app = new Hono<AppEnv>();

// Global Error Handler
app.onError((err, c) => {
    logger.error({
        domain: "SYSTEM",
        url: c.req.url,
        method: c.req.method,
        err,
    }, `Unhandled exception: ${err.message}`);
    return c.text("Internal Server Error", 500);
});

// Middleware pipeline
app.use('*', honoLogger());
app.use(
    '*',
    bodyLimit({
        maxSize: 10 * 1024 * 1024 * 1024, // 10GB
        onError: (c) => c.text('File too large', 413),
    })
);
app.use(
    '*',
    secureHeaders({
        contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline for the SW registration script
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            mediaSrc: ["'self'", "data:", "blob:"],
            objectSrc: ["'none'"],
            workerSrc: ["'self'"],
            manifestSrc: ["'self'"],
        },
    })
);

// Static files (Code/CSS/JS)
app.use('/public/*', serveStatic({ root: './' }));

// Global Rate Limiter
app.use(
    "*",
    rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 10000,
        standardHeaders: "draft-6",
        keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous",
    })
);

// CSRF Protection
app.use('*', async (c, next) => {
    if (c.req.header('Authorization')?.startsWith('Bearer ')) {
        return await next();
    }
    return await csrf()(c, next);
});

app.use('*', renderer);
app.use('*', authMiddleware);

// Mount Sub-Routers
app.route("/", systemRouter);
app.route("/", mediaRouter);
app.route("/", authRouter);
app.route("/", settingsRouter);
app.route("/", viewerRouter);
app.route("/", postRouter);
app.route("/", tagRouter);
app.route("/upload", uploadRouter);

logger.info({ domain: "SYSTEM", port: CONFIG.PORT }, "PiBooru started");

export default {
    port: CONFIG.PORT,
    fetch: app.fetch,
};
