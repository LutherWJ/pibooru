import type { Context } from "hono";
import { extname, join } from "node:path";
import { unlink, mkdir } from "node:fs/promises";
import { MediaService } from "../services/MediaService";
import { PostModel } from "../models/Post";
import { DirectoryModel } from "../models/Directory";
import { PATHS } from "../util/paths";
import { logger } from "../util/logger";
import { Upload } from "../views/Upload";
import type { AppEnv } from "../types";
import type { PostRating } from "../db/schema";

export class UploadController {
    static async showUpload(c: Context<AppEnv>) {
        return c.render(<Upload />);
    }

    static async handleUpload(c: Context<AppEnv>) {
        const { file, rating, source, tags: rawTags } = c.req.valid("form" as never) as {
            file: File;
            rating: PostRating;
            source?: string | null;
            tags: string;
        };

        let tempPath: string | null = null;
        let preHashTempPath: string | null = null;
        let shardedPaths: { original: string; thumb: string } | null = null;

        try {
            // 1. Prepare for streaming
            const extension = extname(file.name).toLowerCase();
            const tempDir = join(PATHS.DATA, "temp");
            await mkdir(tempDir, { recursive: true });

            // Temporary filename until hash is known
            preHashTempPath = join(tempDir, `upload-${crypto.randomUUID()}${extension}`);

            const hasher = new Bun.CryptoHasher("sha256");
            const fileWriter = Bun.file(preHashTempPath).writer();

            // 2. Stream file to disk and calculate hash incrementally (OOM safety)
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

            // Pre-calculate sharded paths for rollback reliability
            const originalPath = MediaService.getShardedPath("original", hash, extension);
            const thumbPath = MediaService.getShardedPath("thumbs", hash, ".webp");
            shardedPaths = { original: originalPath, thumb: thumbPath };

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

            // 3. Process with MediaService (Sharding + Thumbnailing + Metadata Stripping)
            const processed = await MediaService.processUpload(tempPath, hash, extension);

            // 4. Save to database
            const mimeType = file.type || (processed.metadata.mimeType === "webp" ? "image/webp" : "application/octet-stream");
            const postId = PostModel.create({
                hash,
                extension,
                mime_type: mimeType,
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

            // Automatically place newly uploaded post into Root directory
            try {
                DirectoryModel.addToRoot(postId, `${hash}${extension}`);
            } catch (dirErr) {
                logger.error({ domain: "UPLOAD", postId, err: dirErr }, "Failed to link post to root directory");
            }

            logger.info({
                domain: "UPLOAD",
                postId,
                hash,
                extension,
                size: file.size
            }, "Successfully processed upload");

            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: true, postId, redirectUrl: `/post/${postId}` });
            }
            return c.redirect(`/post/${postId}`);

        } catch (error) {
            logger.error({
                domain: "UPLOAD",
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                err: error
            }, "Upload processing failed");

            // ROLLBACK: Cleanup any files created during this failed attempt
            if (shardedPaths) {
                const hash = shardedPaths.original.split('/').pop()?.split('.')[0];
                const exists = hash ? PostModel.getByHash(hash) : true;
                if (!exists) {
                    try { await unlink(shardedPaths.original); } catch {}
                    try { await unlink(shardedPaths.thumb); } catch {}
                }
            }

            const isClientError = error instanceof Error && error.message.includes("Invalid or unsupported media file");
            const statusCode = isClientError ? 400 : 500;
            const message = `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`;
            if (c.req.header("accept")?.includes("application/json")) {
                return c.json({ success: false, error: message }, statusCode);
            }
            return c.text(message, statusCode);
        } finally {
            if (preHashTempPath) {
                try { await unlink(preHashTempPath); } catch {}
            }
            if (tempPath) {
                try { await unlink(tempPath); } catch {}
            }
        }
    }
}
