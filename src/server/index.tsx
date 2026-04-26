import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { join } from "node:path";
import { CONFIG } from "./util/config";
import { PATHS } from "./util/paths";
import { initDb } from "./db";

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

const app = new Hono();

// Favicon - immediate return to stop 404s
app.get('/favicon.ico', (c) => c.body(null, 204));

// Middleware
app.use('*', logger());
app.use('*', csrf());
app.use(
    '*',
    secureHeaders({
        contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            mediaSrc: ["'self'", "data:", "blob:"],
            objectSrc: ["'none'"],
        },
    })
);

// Global Rate Limiter
const limiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10000, // Limit each IP to 1000 requests per `window`
    standardHeaders: "draft-6", // Set `RateLimit-*` headers
    keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous", // Simple IP tracking
});
app.use("*", limiter);

app.use('*', renderer);

// Static files (Code/CSS/JS)
app.use('/public/*', serveStatic({ root: './' }));

// Serve media/data from the configured DATA_DIR
// Restricted to original and thumbs subdirectories for security
app.use('/data/original/*', (c, next) => {
    return serveStatic({
        root: PATHS.DATA,
        rewriteRequestPath: (path) => path.replace(/^\/data/, '')
    })(c, next);
});

app.use('/data/thumbs/*', (c, next) => {
    return serveStatic({
        root: PATHS.DATA,
        rewriteRequestPath: (path) => path.replace(/^\/data/, '')
    })(c, next);
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

        // Get the last token
        const tokens = input.trimEnd().split(/\s+/);
        let lastToken = tokens[tokens.length - 1] || "";

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
