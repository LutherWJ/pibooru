import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
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
import { User } from "./db/schema";

import { renderer } from "./middleware/renderer";
import { Home } from "./views/Home";
import { PostDetail } from "./views/PostDetail";
import { Tags } from "./views/Tags";
import uploadApp from "./routes/upload";
import { PostModel } from "./models/Post";
import { TagModel } from "./models/Tag";
import { SearchParser } from "./util/SearchParser";
import { TagSuggestions } from "./components/TagSuggestions";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

// Initialize Database
console.log("Initializing PiBooru...");
await initDb();

const app = new Hono<{ Variables: { user: User } }>();

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
app.use('*', logger());
app.use(
    '*',
    bodyLimit({
        maxSize: 1024 * 1024 * 1024, // 1GB
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

// Custom robust media server for external DATA_DIR
app.get('/data/*', async (c) => {
    // Manually reconstruct the relative path from the URL
    const url = new URL(c.req.url);
    const pathPart = url.pathname.replace(/^\/data\//, '');
    const fullPath = join(PATHS.DATA, pathPart);
    
    const file = Bun.file(fullPath);
    const exists = await file.exists();

    // Log the attempt to the console for debugging
    console.log(`[MEDIA] ${exists ? 'SERVE' : '404  '} -> ${fullPath}`);

    if (!exists) {
        return c.text('Not Found', 404);
    }

    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(file as any);
});

// CSRF Protection with bypass for the bulk uploader
app.use('*', (c, next) => {
    if (c.req.header('X-MyBooru-Uploader') === 'true') {
        return next();
    }
    return csrf()(c, next);
});

// Global Rate Limiter
const limiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10000, // Limit each IP to 1000 requests per `window`
    standardHeaders: "draft-6", // Set `RateLimit-*` headers
    keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous", // Simple IP tracking
});
app.use("*", limiter);

app.use('*', renderer);

app.use('*', authMiddleware);

// Authentication Routes
app.get("/login", (c) => c.render(<Login />, { title: "Login" }));
app.post(
    "/login",
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

app.get("/register", (c) => c.render(<Login mode="register" />, { title: "Register" }));
app.post(
    "/register",
    zValidator("form", z.object({
        username: z.string().min(3).max(32),
        password: z.string().min(8)
    })),
    async (c) => {
        const { username, password } = c.req.valid("form");
        
        if (UserModel.findByUsername(username)) {
            return c.render(<Login mode="register" error="Username already exists" />, { title: "Register" });
        }
        
        const userId = await UserModel.create(username, password);
        if (userId) {
            await setSignedCookie(c, "session_id", userId.toString(), CONFIG.COOKIE_SECRET, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Lax",
                maxAge: 60 * 60 * 24 * 30
            });
            return c.redirect("/");
        }
        
        return c.render(<Login mode="register" error="Failed to create account" />, { title: "Register" });
    }
);

app.get("/logout", (c) => {
    deleteCookie(c, "session_id");
    return c.redirect("/login");
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
        return c.redirect(`/post/${id}`);
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

app.route("/upload", uploadApp);

console.log(`PiBooru started on port ${CONFIG.PORT}`);

export default {
    port: CONFIG.PORT,
    fetch: app.fetch,
};
