import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Upload } from "../views/Upload";
import { MediaService } from "../services/MediaService";
import { PostModel } from "../models/Post";
import { PostRatingSchema } from "../db/schema";
import { extname, join } from "node:path";
import { unlink, mkdir } from "node:fs/promises";
import { PATHS } from "../util/paths";
import { logger } from "../util/logger";

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
        let tempPath: string | null = null;
        let preHashTempPath: string | null = null;
        let shardedPaths: { original: string; thumb: string } | null = null;

        try {
            // 1. Prepare for streaming
            const extension = extname(file.name).toLowerCase();
            const tempDir = join(PATHS.DATA, "temp");
            await mkdir(tempDir, { recursive: true });

            // We use a temporary filename until we have the hash
            preHashTempPath = join(tempDir, `upload-${crypto.randomUUID()}${extension}`);
            
            const hasher = new Bun.CryptoHasher("sha256");
            const fileWriter = Bun.file(preHashTempPath).writer();
            
            // 2. Stream the file to disk and calculate hash incrementally
            // This prevents loading the entire file into memory (OOM safety)
            const reader = file.stream().getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                hasher.update(value);
                fileWriter.write(value);
            }
            fileWriter.end();
            
            const hash = hasher.digest("hex");
            tempPath = join(tempDir, `${hash}${extension}`);

            // Check if already exists in DB
            const existing = PostModel.getByHash(hash);
            if (existing) {
                await unlink(preHashTempPath);
                preHashTempPath = null;
                if (c.req.header("accept")?.includes("application/json")) {
                    return c.json({ success: true, postId: existing.id, redirectUrl: `/post/${existing.id}`, alreadyExists: true });
                }
                return c.redirect(`/post/${existing.id}`);
            }

            // Move to final temp path (named by hash)
            await Bun.write(tempPath, Bun.file(preHashTempPath));
            await unlink(preHashTempPath);
            preHashTempPath = null;

            // 3. Process with MediaService (Sharding + Thumbnailing)
            const processed = await MediaService.processUpload(tempPath, hash, extension);
            shardedPaths = {
                original: processed.originalPath,
                thumb: processed.thumbPath
            };

            // 4. Save to database
            const postId = PostModel.create({
                hash,
                extension,
                mime_type: file.type,
                size_bytes: file.size,
                width: processed.metadata.width || null,
                height: processed.metadata.height || null,
                duration: processed.metadata.duration || null,
                rating,
                source: source ?? null,
                parent_id: null,
                has_children: false,
                user_id: null,
            }, rawTags);

            logger.info("UPLOAD", `Successfully processed upload: ${postId}`, {
                hash,
                extension,
                size: file.size
            });

            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: true, postId, redirectUrl: `/post/${postId}` });
            }
            return c.redirect(`/post/${postId}`);

        } catch (error) {
            logger.error("UPLOAD", "Upload processing failed", {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                error
            });
            
            // ROLLBACK: Cleanup any files created during this failed attempt
            if (shardedPaths) {
                try { await unlink(shardedPaths.original); } catch {}
                try { await unlink(shardedPaths.thumb); } catch {}
            }

            const message = `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`;
            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: false, error: message }, 500);
            }
            return c.text(message, 500);
        } finally {
            // Cleanup temp files always
            if (preHashTempPath) {
                try { await unlink(preHashTempPath); } catch {}
            }
            if (tempPath) {
                try { await unlink(tempPath); } catch {}
            }
        }
    });

export default uploadApp;
