import { join, dirname, extname } from "node:path";
import { mkdir } from "node:fs/promises";
import { CONFIG } from "../util/config";
import { PATHS } from "../util/paths";
import { logger } from "../util/logger";

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  mimeType: string;
}

export class MediaService {
  /**
   * Probes a file using ffprobe to extract metadata.
   */
  static async probe(filePath: string): Promise<MediaMetadata> {
    const args = [
      CONFIG.FFPROBE_PATH,
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration",
      "-show_entries", "format=format_name,duration",
      "-of", "json",
      filePath
    ];

    const proc = Bun.spawn(args, { stderr: "pipe" });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    
    if (exitCode !== 0) {
      const errorText = await new Response(proc.stderr).text();
      const msg = `ffprobe failed (code ${exitCode})`;
      logger.error({
        domain: "MEDIA",
        command: args.join(" "),
        file: filePath,
        stderr: errorText
      }, msg);
      throw new Error(`${msg}: ${errorText}`);
    }

    try {
      const output = JSON.parse(text);
      const stream = output.streams?.[0];
      const format = output.format;

      let mimeType = format?.format_name || "unknown";
      // Normalize pipe-based format names
      if (mimeType.endsWith("_pipe")) {
        mimeType = mimeType.replace("_pipe", "");
      }

      return {
        width: stream?.width,
        height: stream?.height,
        duration: stream?.duration ? parseFloat(stream.duration) : (format?.duration ? parseFloat(format.duration) : undefined),
        mimeType
      };
    } catch (e) {
      const msg = "Failed to parse ffprobe output";
      logger.error({
        domain: "MEDIA",
        output: text,
        file: filePath,
        err: e
      }, msg);
      throw new Error(`${msg}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * Generates a WebP thumbnail for an image or video.
   */
  static async generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });

    const metadata = await this.probe(inputPath);
    // Only treat as video if duration is significantly above 0 (avoids MJPEG image duration issues)
    const isVideo = metadata.duration !== undefined && metadata.duration > 0.1;

    const args = [
      CONFIG.FFMPEG_PATH,
      "-y", // Overwrite
    ];

    if (isVideo) {
      // For video, seek to 1 second, or 0 if video is too short
      const seekTime = (metadata.duration || 0) > 1 ? "00:00:01" : "00:00:00";
      args.push("-ss", seekTime);
    }

    args.push("-i", inputPath);

    // Always force 1 frame to ensure a static thumbnail and save memory
    args.push("-vframes", "1");

    args.push(
      "-c:v", "libwebp", // Force static WebP encoder
      "-vf", "scale=300:-1:force_original_aspect_ratio=decrease",
      "-q:v", "75", // WebP quality
      outputPath
    );

    const proc = Bun.spawn(args, {
      stderr: "pipe"
    });
    
    const exitCode = await proc.exited;
    const errorText = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      logger.error({
        domain: "MEDIA",
        command: args.join(" "),
        stderr: errorText,
        input: inputPath,
        output: outputPath
      }, "FFmpeg thumbnail generation failed");
      throw new Error(`FFmpeg failed (code ${exitCode}): ${errorText}`);
    }

    // Paranoia check: Does it actually exist and have size?
    const result = Bun.file(outputPath);
    if (!(await result.exists()) || result.size === 0) {
      logger.error({
        domain: "MEDIA",
        command: args.join(" "),
        stderr: errorText,
        outputPath
      }, "FFmpeg reported success but result is missing or 0 bytes");
      throw new Error(`FFmpeg reported success but result is missing or 0 bytes`);
    }
  }

  /**
   * Calculates the sharded path for a file based on its hash.
   * Format: [prefix]/[ab]/[cd]/[hash].[ext]
   */
  static getShardedPath(prefix: string, hash: string, extension: string): string {
    const l1 = hash.slice(0, 2);
    const l2 = hash.slice(2, 4);
    // Ensure extension starts with a dot
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    return join(PATHS.DATA, prefix, l1, l2, `${hash}${ext}`);
  }

  /**
   * Copies a file while stripping all metadata.
   */
  static async stripMetadata(inputPath: string, outputPath: string): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });

    const args = [
      CONFIG.FFMPEG_PATH,
      "-y",
      "-i", inputPath,
      "-map_metadata", "-1",
      "-c", "copy",
      outputPath
    ];

    const proc = Bun.spawn(args, { stderr: "pipe" });
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const errorText = await new Response(proc.stderr).text();
      // If "-c copy" fails (e.g. for some unusual formats), we might want a fallback, 
      // but for now, we'll treat it as a failure for security/privacy consistency.
      logger.error({
        domain: "MEDIA",
        command: args.join(" "),
        stderr: errorText,
        input: inputPath,
        output: outputPath
      }, "FFmpeg metadata stripping failed");
      throw new Error(`FFmpeg metadata stripping failed: ${errorText}`);
    }
  }

  /**
   * Full pipeline for a new file.
   */
  static async processUpload(tempPath: string, hash: string, originalExt: string) {
    const originalPath = this.getShardedPath("original", hash, originalExt);
    const thumbPath = this.getShardedPath("thumbs", hash, ".webp");

    // 1. Get metadata and validate early (prevents moving non-media files)
    const metadata = await this.probe(tempPath);
    
    // Simple validation: Ensure it's something ffprobe recognizes as a valid format
    if (metadata.mimeType === "unknown" || (!metadata.width && !metadata.duration)) {
        throw new Error("Invalid or unsupported media file");
    }

    // Ensure directories exist
    await mkdir(dirname(originalPath), { recursive: true });
    await mkdir(dirname(thumbPath), { recursive: true });

    // 2. Move to original storage while stripping metadata
    await this.stripMetadata(tempPath, originalPath);
    
    // 3. Generate thumbnail from the stripped original
    await this.generateThumbnail(originalPath, thumbPath);

    return {
      originalPath,
      thumbPath,
      metadata
    };
  }
}
