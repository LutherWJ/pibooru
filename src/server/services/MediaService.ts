import { join, dirname, extname } from "node:path";
import { mkdir } from "node:fs/promises";
import { CONFIG } from "../util/config";
import { PATHS } from "../util/paths";

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
    const proc = Bun.spawn([
      CONFIG.FFPROBE_PATH,
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration",
      "-show_entries", "format=format_name,duration",
      "-of", "json",
      filePath
    ]);

    const output = await new Response(proc.stdout).json();
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

    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`FFmpeg failed with exit code ${exitCode}. Stderr: ${error}`);
    }
  }

  /**
   * Calculates the sharded path for a file based on its hash.
   * Format: [prefix]/[ab]/[cd]/[hash].[ext]
   */
  static getShardedPath(prefix: string, hash: string, extension: string): string {
    const l1 = hash.slice(0, 2);
    const l2 = hash.slice(2, 4);
    return join(PATHS.DATA, prefix, l1, l2, `${hash}${extension}`);
  }

  /**
   * Full pipeline for a new file.
   */
  static async processUpload(tempPath: string, hash: string, originalExt: string) {
    const originalPath = this.getShardedPath("original", hash, originalExt);
    const thumbPath = this.getShardedPath("thumbs", hash, ".webp");

    // Ensure directories exist
    await mkdir(dirname(originalPath), { recursive: true });
    await mkdir(dirname(thumbPath), { recursive: true });

    // Move to original storage
    await Bun.write(originalPath, Bun.file(tempPath));
    
    // Generate thumbnail
    await this.generateThumbnail(originalPath, thumbPath);

    // Get metadata
    const metadata = await this.probe(originalPath);

    return {
      originalPath,
      thumbPath,
      metadata
    };
  }
}
