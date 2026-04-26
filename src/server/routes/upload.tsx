import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { rateLimiter } from "hono-rate-limiter";
import { Upload } from "../views/Upload";
import { MediaService } from "../services/MediaService";
import { PostModel } from "../models/Post";
import { PostRatingSchema } from "../db/schema";
import { extname, join } from "node:path";
import { unlink, mkdir } from "node:fs/promises";
import { PATHS } from "../util/paths";

const uploadApp = new Hono();
uploadApp.get("/", (c) => c.render(<Upload />));

uploadApp.post(
    "/",
    zValidator(
        "form",
        z.object({
            file: z.any().refine((file) => file instanceof File, "File is required"),
            rating: PostRatingSchema.default("s"),
            source: z.string().optional().nullable(),
            tags: z.string().optional().default(""),
        }),
        (result, c) => {
            if (!result.success) {
                if (c.req.header("accept")?.includes("application/json")) {
                    return c.json({ success: false, error: result.error.issues }, 400);
                }
            }
        }
    ),
    async (c) => {
        const { file, rating, source, tags: rawTags } = c.req.valid("form");

        // 1. Calculate hash
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const hash = new Bun.CryptoHasher("sha256").update(buffer).digest("hex");

        // Check if already exists
        const existing = PostModel.getByHash(hash);
        if (existing) {
            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: true, postId: existing.id, redirectUrl: `/post/${existing.id}`, alreadyExists: true });
            }
            return c.redirect(`/post/${existing.id}`);
        }

        const extension = extname(file.name).toLowerCase();
        const tempDir = join(PATHS.DATA, "temp");
        const tempPath = join(tempDir, `${hash}${extension}`);

        // Ensure temp dir and save file
        await mkdir(tempDir, { recursive: true });
        await Bun.write(tempPath, buffer);

        try {
            // 2. Process with MediaService (Sharding + Thumbnailing)
            const { metadata } = await MediaService.processUpload(tempPath, hash, extension);

            // 3. Save to database using PostModel
            const postId = PostModel.create({
                hash,
                extension,
                mime_type: file.type,
                size_bytes: file.size,
                width: metadata.width || null,
                height: metadata.height || null,
                duration: metadata.duration || null,
                rating,
                source: source ?? null,
                parent_id: null,
                has_children: false,
                user_id: null,
            }, rawTags);

            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: true, postId, redirectUrl: `/post/${postId}` });
            }
            return c.redirect(`/post/${postId}`);
        } catch (error) {
            console.error("Upload failed:", error);
            const message = `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`;
            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: false, error: message }, 500);
            }
            return c.text(message, 500);
        } finally {
            // Cleanup temp
            try {
                await unlink(tempPath);
            } catch (e) { }
        }
    });

export default uploadApp;
