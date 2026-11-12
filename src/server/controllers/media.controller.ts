import type { Context } from "hono";
import { join } from "node:path";
import { PATHS } from "../util/paths";
import { logger } from "../util/logger";
import type { AppEnv } from "../types";

export class MediaController {
    static async serveMedia(c: Context<AppEnv>) {
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

        if (!exists) {
            logger.warn({ domain: "MEDIA", safePath }, "404 -> Not Found");
            return c.text('Not Found', 404);
        }

        logger.debug({ domain: "MEDIA", safePath }, "SERVE -> Serving file");

        c.header('Cache-Control', 'public, max-age=31536000, immutable');
        return c.body(file as any);
    }
}
