import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger as honoLogger } from "hono/logger";
import { csrf } from "hono/csrf";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { join } from "node:path";
import { CONFIG } from "./util/config";
import { PATHS } from "./util/paths";
import { initDb } from "./db";
import { deleteCookie, setSignedCookie } from "hono/cookie";
import { authMiddleware } from "./middleware/auth";
import { UserModel } from "./models/User";
import { Login } from "./views/Login";
import type { User } from "./db/schema";

import { renderer } from "./middleware/renderer";
import { Home } from "./views/Home";
import { PostDetail } from "./views/PostDetail";
import { Tags } from "./views/Tags";
import { TagDetail } from "./views/TagDetail";
import { Settings, ApiKeyFragment } from "./views/Settings";
import uploadApp from "./routes/upload";
import { PostModel } from "./models/Post";
import { TagModel } from "./models/Tag";
import { SearchParser } from "./util/SearchParser";
import { TagSuggestions } from "./components/TagSuggestions";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import { logger } from "./util/logger";

// Log system paths for debugging
logger.info({
    domain: "SYSTEM",
    root: PATHS.ROOT,
    data: PATHS.DATA,
    migrations: PATHS.MIGRATIONS
}, "System paths resolved");

// Initialize Database
logger.info({ domain: "SYSTEM" }, "Initializing PiBooru...");
await initDb();

const app = new Hono<{ Variables: { user: User } }>();

// Global Error Handler
app.onError((err, c) => {
    logger.error({
        domain: "SYSTEM",
        url: c.req.url,
        method: c.req.method,
        err
    }, `Unhandled exception: ${err.message}`);
    return c.text("Internal Server Error", 500);
});

// Favicon - immediate return to stop 404s
app.get('/favicon.ico', (c) => c.body(null, 204));

// PWA Assets
app.get('/manifest.json', serveStatic({ path: './public/manifest.json' }));
app.get('/sw.js', serveStatic({ path: './public/sw.js' }));

app.get('/offline', (c) => {
    return c.render(
        <div style="text-align: center; padding: 2rem;">
            <h2>You are offline</h2>
            <p>PiBooru is currently unavailable without an internet connection.</p>
            <a href="/" class="button">Try Again</a>
        </div>,
        { title: "Offline" }
    );
});

// Middleware
app.use('*', honoLogger());
app.use(
    '*',
    bodyLimit({
        maxSize: 10 * 1024 * 1024 * 1024, // 1GB
        onError: (c) => {
            return c.text('File too large', 413);
        },
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
const limiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10000, // Limit each IP to 10000 requests per `window`
    standardHeaders: "draft-6", // Set `RateLimit-*` headers
    keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous", // Simple IP tracking
});
app.use("*", limiter);

// Strict Login Rate Limiter
const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: "Too many login attempts, please try again later",
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous",
});

// CSRF Protection
app.use('*', async (c, next) => {
    if (c.req.header('Authorization')?.startsWith('Bearer ')) {
        return await next();
    }
    return await csrf()(c, next);
});

app.use('*', renderer);

app.use('*', authMiddleware);

// Custom robust media server for external DATA_DIR
app.get('/data/*', async (c) => {
    // Manually reconstruct the relative path from the URL
    const url = new URL(c.req.url);
    const pathPart = decodeURIComponent(url.pathname.replace(/^\/data\//, ''));

    // Security: Prevent path traversal using a strict prefix check
    const safePath = join(PATHS.DATA, pathPart);
    if (!safePath.startsWith(PATHS.DATA + "/")) {
        logger.warn({ domain: "SECURITY", safePath }, "Blocked path traversal attempt");
        return c.text('Forbidden', 403);
    }

    const file = Bun.file(safePath);
    const exists = await file.exists();

    // Log the attempt for debugging
    if (!exists) {
        logger.warn({ domain: "MEDIA", safePath }, "404 -> Not Found");
        return c.text('Not Found', 404);
    }

    logger.debug({ domain: "MEDIA", safePath }, "SERVE -> Serving file");

    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(file as any);
});

// Authentication Routes
app.get("/login", (c) => c.render(<Login />, { title: "Login" }));
app.post(
    "/login",
    loginLimiter,
    zValidator("form", z.object({
        username: z.string().min(1),
        password: z.string().min(1)
    })),
    async (c) => {
        const { username, password } = c.req.valid("form");
        const user = await UserModel.verifyPassword(username, password);

        if (user) {
            await setSignedCookie(c, "session_id", user.id.toString(), CONFIG.COOKIE_SECRET, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Lax",
                maxAge: 60 * 60 * 24 * 30 // 30 days
            });
            return c.redirect("/");
        }

        return c.render(<Login error="Invalid username or password" />, { title: "Login" });
    }
);

app.get("/logout", (c) => {
    deleteCookie(c, "session_id");
    return c.redirect("/login");
});

app.get("/settings", (c) => {
    const user = c.var.user;
    return c.render(<Settings user={user} apiKey={user.api_key || null} />, { title: "Settings" });
});

app.post("/settings/rotate-api-key", async (c) => {
    const user = c.var.user;
    const newKey = UserModel.generateApiKey(user.id);
    return c.html(<ApiKeyFragment apiKey={newKey} />);
});

// Routes
app.get(
    "/",
    zValidator(
        "query",
        z.object({
            tags: z.string().optional().default(""),
            page: z.string().optional().default("1"),
        })
    ),
    (c) => {
        const { tags: tagsParam, page: pageStr } = c.req.valid("query");
        const limit = 50;
        let offset = 0;
        const query = SearchParser.parse(tagsParam);

        // Hybrid pagination handling
        let pageNum = 1;
        if (pageStr.startsWith("b")) {
            query.before_id = parseInt(pageStr.substring(1), 10);
        } else if (pageStr.startsWith("a")) {
            query.after_id = parseInt(pageStr.substring(1), 10);
        } else {
            pageNum = parseInt(pageStr, 10) || 1;
            offset = (pageNum - 1) * limit;
        }

        const posts = PostModel.search(query, limit, offset);
        const totalCount = PostModel.count(query);
        const relatedTags = PostModel.getRelatedTags(query);

        // Robust pagination state
        let hasPrev = false;
        let hasNext = false;
        if (posts.length > 0) {
            const firstPostId = (posts[0] as any).id;
            const lastPostId = (posts[posts.length - 1] as any).id;
            hasPrev = PostModel.hasNewer(query, firstPostId);
            hasNext = PostModel.hasOlder(query, lastPostId);
        }

        return c.render(
            <Home
                posts={posts}
                tags={relatedTags}
                searchQuery={tagsParam}
                currentPage={pageStr}
                totalCount={totalCount}
                limit={limit}
                hasPrev={hasPrev}
                hasNext={hasNext}
            />
        );
    }
);

app.get(
    "/partials/tags/suggestions",
    zValidator("query", z.object({
        q: z.string().optional(),
        tags: z.string().optional()
    })),
    async (c) => {
        const { q, tags } = c.req.valid("query");
        const input = q || tags || "";

        // If the input ends with a space, the user is starting a new tag
        let lastToken = "";
        if (input.length > 0 && !input.endsWith(' ')) {
            const tokens = input.trim().split(/\s+/);
            lastToken = tokens[tokens.length - 1] || "";
        }

        if (!lastToken) {
            // Return empty fragment to close the dropdown
            return c.html("");
        }

        // Handle negated tags
        if (lastToken.startsWith("-")) {
            lastToken = lastToken.substring(1);
        }

        const suggestions = TagModel.search(lastToken);

        // Return HTML fragment directly (no layout)
        return c.html(<TagSuggestions tags={suggestions} />);
    }
);

app.get(
    "/tags",
    zValidator(
        "query",
        z.object({
            q: z.string().optional().default(""),
            page: z.string().optional().default("1"),
        })
    ),
    (c) => {
        const { q, page: pageStr } = c.req.valid("query");
        const limit = 100;
        const page = parseInt(pageStr, 10) || 1;
        const offset = (page - 1) * limit;

        const tags = TagModel.getPaginated(q, limit, offset);
        const totalCount = TagModel.countTotal(q);

        return c.render(
            <Tags
                tags={tags}
                query={q}
                page={page}
                totalCount={totalCount}
                limit={limit}
            />,
            { title: "Tags" }
        );
    }
);

app.get(
    "/post/:id",
    zValidator(
        "param",
        z.object({
            id: z.string().transform((v) => parseInt(v, 10)),
        })
    ),
    (c) => {
        const { id } = c.req.valid("param");
        const post = PostModel.getById(id);

        if (!post) {
            return c.notFound();
        }

        const tags = PostModel.getTags(id);
        return c.render(<PostDetail post={post} tags={tags} />, {
            title: `Post ${id}`,
        });
    }
);

app.post(
    "/post/:id/tags",
    zValidator("param", z.object({ id: z.string().transform(v => parseInt(v, 10)) })),
    zValidator("form", z.object({ tags: z.string() })),
    async (c) => {
        const { id } = c.req.valid("param");
        const { tags } = c.req.valid("form");
        PostModel.updateTags(id, tags);

        const url = `/post/${id}`;
        if (c.req.header('hx-request')) {
            c.header('HX-Replace-Url', url);
        }
        return c.redirect(url);
    }
);

app.delete(
    "/post/:id",
    zValidator("param", z.object({ id: z.string().transform(v => parseInt(v, 10)) })),
    async (c) => {
        const { id } = c.req.valid("param");
        await PostModel.delete(id);
        // HTMX redirect if requested
        if (c.req.header('hx-request')) {
            c.header('HX-Redirect', '/');
            return c.text('Deleted');
        }
        return c.redirect("/");
    }
);

app.get(
    "/tag/:name",
    zValidator("param", z.object({ name: z.string() })),
    (c) => {
        const { name } = c.req.valid("param");
        const tag = TagModel.getByName(name);
        if (!tag) return c.notFound();

        const aliases = TagModel.getAliases(tag.id);
        const implications = TagModel.getImplications(tag.id);
        const posts = PostModel.search({ tags: [{ name: tag.name, namespace: tag.namespace, negated: false }] }, 20);

        return c.render(
            <TagDetail
                tag={tag}
                aliases={aliases}
                implications={implications}
                posts={posts}
            />,
            { title: `Tag: ${tag.name}` }
        );
    }
);

// --- Tag API Endpoints ---

app.post(
    "/api/tags/:name/alias",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("form", z.object({ alias: z.string() })),
    async (c) => {
        const { name } = c.req.valid("param");
        const { alias } = c.req.valid("form");
        const tag = TagModel.getByName(name);
        if (!tag) return c.notFound();

        TagModel.addAlias(tag.id, alias);

        return c.html(
            <li style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>{alias}</span>
                <button
                    hx-delete={`/api/tags/${tag.name}/alias/${alias}`}
                    hx-target="closest li"
                    hx-swap="outerHTML"
                    style="background: #ef4444; color: white; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px;"
                >
                    Delete
                </button>
            </li>
        );
    }
);

app.delete(
    "/api/tags/:name/alias/:alias_name",
    zValidator("param", z.object({ name: z.string(), alias_name: z.string() })),
    async (c) => {
        const { alias_name } = c.req.valid("param");
        TagModel.removeAlias(alias_name);
        return c.body(null, 204);
    }
);

app.post(
    "/api/tags/:name/implication",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("form", z.object({ target_tag: z.string() })),
    async (c) => {
        const { name } = c.req.valid("param");
        const { target_tag: targetTagName } = c.req.valid("form");

        const sourceTag = TagModel.getByName(name);
        if (!sourceTag) return c.notFound();

        const { name: targetName, namespace: targetNamespace } = TagModel.parseRaw(targetTagName);
        const targetTagId = TagModel.getOrCreate(targetName, targetNamespace);
        const targetTag = TagModel.getById(targetTagId);

        if (!targetTag) return c.notFound();

        TagModel.addImplication(sourceTag.id, targetTag.id);

        return c.html(
            <li style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <a href={`/tag/${targetTag.name}`} class={`tag-type-${targetTag.namespace}`}>{targetTag.name}</a>
                <button
                    hx-delete={`/api/tags/${sourceTag.name}/implication/${targetTag.id}`}
                    hx-target="closest li"
                    hx-swap="outerHTML"
                    style="background: #ef4444; color: white; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px;"
                >
                    Delete
                </button>
            </li>
        );
    }
);

app.delete(
    "/api/tags/:name/implication/:target_id",
    zValidator("param", z.object({ name: z.string(), target_id: z.string().transform(v => parseInt(v, 10)) })),
    async (c) => {
        const { name, target_id } = c.req.valid("param");
        const sourceTag = TagModel.getByName(name);
        if (!sourceTag) return c.notFound();

        TagModel.removeImplication(sourceTag.id, target_id);
        return c.body(null, 204);
    }
);

app.route("/upload", uploadApp);

logger.info({ domain: "SYSTEM", port: CONFIG.PORT }, "PiBooru started");

export default {
    port: CONFIG.PORT,
    fetch: app.fetch,
};
