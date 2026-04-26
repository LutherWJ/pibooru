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

// Stricter rate limit for uploads (FFmpeg is expensive)
const uploadLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 10, // 10 uploads per 10 minutes
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous",
  message: "Too many uploads, please try again later.",
});

uploadApp.get("/", (c) => c.render(<Upload />));

uploadApp.post(
  "/",
  uploadLimiter,
  zValidator(
    "form",
    z.object({
      file: z.any().refine((file) => file instanceof File, "File is required"),
      rating: PostRatingSchema.default("s"),
      source: z.string().optional().nullable(),
      tags: z.string().optional().default(""),
    })
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
      source,
      parent_id: null,
      has_children: false,
    }, rawTags);

    return c.redirect(`/post/${postId}`);
  } catch (error) {
    console.error("Upload failed:", error);
    return c.text(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`, 500);
  } finally {
    // Cleanup temp
    try {
      await unlink(tempPath);
    } catch (e) {}
  }
});

export default uploadApp;
