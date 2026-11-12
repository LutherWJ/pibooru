import { join, dirname, extname } from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { CONFIG } from "../util/config";
import { PATHS } from "../util/paths";
import { logger } from "../util/logger";

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  mimeType: string;
  isAnimated?: boolean;
}

export class MediaService {
  /**
   * Parses WebP binary container headers directly to extract dimensions,
   * animation status, and duration without depending on FFmpeg decoder support.
   */
  static async parseWebPInfo(filePath: string): Promise<{ width?: number; height?: number; duration?: number; isAnimated: boolean } | null> {
    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) return null;

      const buf = await file.arrayBuffer();
      const u8 = new Uint8Array(buf);
      const view = new DataView(buf);
      if (u8.length < 12) return null;

      const riff = String.fromCharCode(...u8.subarray(0, 4));
      const webp = String.fromCharCode(...u8.subarray(8, 12));
      if (riff !== "RIFF" || webp !== "WEBP") return null;

      let offset = 12;
      let width: number | undefined;
      let height: number | undefined;
      let isAnimated = false;
      let totalDurationMs = 0;

      while (offset + 8 <= u8.length) {
        const tag = String.fromCharCode(...u8.subarray(offset, offset + 4));
        const size = view.getUint32(offset + 4, true);
        const pOffset = offset + 8;

        if (tag === "VP8X" && size >= 10 && pOffset + 10 <= u8.length) {
          const flags = view.getUint8(pOffset);
          isAnimated = (flags & 0x02) !== 0; // Bit 1: Animation
          const w0 = view.getUint8(pOffset + 4);
          const w1 = view.getUint8(pOffset + 5);
          const w2 = view.getUint8(pOffset + 6);
          width = (w0 | (w1 << 8) | (w2 << 16)) + 1;

          const h0 = view.getUint8(pOffset + 7);
          const h1 = view.getUint8(pOffset + 8);
          const h2 = view.getUint8(pOffset + 9);
          height = (h0 | (h1 << 8) | (h2 << 16)) + 1;
        } else if (tag === "VP8 " && size >= 10 && pOffset + 10 <= u8.length && !width) {
          // Keyframe 0x9d 0x01 0x2a sync code
          if (view.getUint8(pOffset + 3) === 0x9d && view.getUint8(pOffset + 4) === 0x01 && view.getUint8(pOffset + 5) === 0x2a) {
            const wRaw = view.getUint16(pOffset + 6, true);
            const hRaw = view.getUint16(pOffset + 8, true);
            width = wRaw & 0x3fff;
            height = hRaw & 0x3fff;
          }
        } else if (tag === "VP8L" && size >= 5 && pOffset + 5 <= u8.length && !width) {
          if (view.getUint8(pOffset) === 0x2f) {
            const b = view.getUint32(pOffset + 1, true);
            width = (b & 0x3fff) + 1;
            height = ((b >> 14) & 0x3fff) + 1;
          }
        } else if (tag === "ANMF" && size >= 16 && pOffset + 16 <= u8.length) {
          const d0 = view.getUint8(pOffset + 12);
          const d1 = view.getUint8(pOffset + 13);
          const d2 = view.getUint8(pOffset + 14);
          const frameMs = d0 | (d1 << 8) | (d2 << 16);
          totalDurationMs += frameMs;
        }

        offset += 8 + size + (size % 2);
      }

      const duration = totalDurationMs > 0 ? totalDurationMs / 1000 : undefined;
      return { width, height, duration, isAnimated };
    } catch (e) {
      logger.error({ domain: "MEDIA", err: e, file: filePath }, "Failed to parse WebP container");
      return null;
    }
  }

  /**
   * Safely strips EXIF, XMP, and ICCP chunks directly from a WebP RIFF container.
   * This preserves animation chunks (ANIM, ANMF) and avoids FFmpeg remuxing failures.
   */
  static async stripWebPMetadata(inputPath: string, outputPath: string): Promise<boolean> {
    try {
      const buf = await Bun.file(inputPath).arrayBuffer();
      const u8 = new Uint8Array(buf);
      const view = new DataView(buf);
      if (u8.length < 12) return false;

      const riff = String.fromCharCode(...u8.subarray(0, 4));
      const webp = String.fromCharCode(...u8.subarray(8, 12));
      if (riff !== "RIFF" || webp !== "WEBP") return false;

      const metadataChunks = new Set(["EXIF", "XMP ", "ICCP"]);
      let offset = 12;
      const keptChunks: Uint8Array[] = [];
      let vp8xFlagsOffset = -1;

      while (offset + 8 <= u8.length) {
        const tag = String.fromCharCode(...u8.subarray(offset, offset + 4));
        const size = view.getUint32(offset + 4, true);
        const chunkTotalLen = 8 + size + (size % 2);
        const chunkData = u8.subarray(offset, Math.min(offset + chunkTotalLen, u8.length));

        if (tag === "VP8X" && size >= 10) {
          vp8xFlagsOffset = keptChunks.reduce((acc, c) => acc + c.length, 12) + 8;
        }

        if (!metadataChunks.has(tag)) {
          keptChunks.push(new Uint8Array(chunkData));
        }
        offset += chunkTotalLen;
      }

      const totalPayloadSize = 4 + keptChunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(8 + totalPayloadSize);
      result.set(new TextEncoder().encode("RIFF"), 0);
      new DataView(result.buffer).setUint32(4, totalPayloadSize, true);
      result.set(new TextEncoder().encode("WEBP"), 8);

      let cur = 12;
      for (const chunk of keptChunks) {
        result.set(chunk, cur);
        cur += chunk.length;
      }

      if (vp8xFlagsOffset !== -1 && vp8xFlagsOffset < result.length) {
        // Clear ICCP (0x20), EXIF (0x08), XMP (0x04) flags
        const currentFlags = new DataView(result.buffer).getUint8(vp8xFlagsOffset);
        new DataView(result.buffer).setUint8(vp8xFlagsOffset, currentFlags & ~(0x20 | 0x08 | 0x04));
      }

      await Bun.write(outputPath, result);
      return true;
    } catch (e) {
      logger.error({ domain: "MEDIA", err: e, input: inputPath }, "Failed to strip WebP metadata");
      return false;
    }
  }

  /**
   * Extracts the first frame of an animated WebP file into a standalone static WebP
   * so FFmpeg can reliably decode and scale it for thumbnails.
   */
  static async extractFirstWebPFrame(inputPath: string, outputPath: string): Promise<boolean> {
    // 1. Try webpmux if installed
    const webpmuxPath = Bun.which("webpmux");
    if (webpmuxPath) {
      const proc = Bun.spawn([webpmuxPath, "-get", "frame", "1", inputPath, "-o", outputPath], {
        stderr: "pipe",
        stdout: "pipe",
      });
      const code = await proc.exited;
      if (code === 0 && (await Bun.file(outputPath).exists())) {
        return true;
      }
    }

    // 2. Pure JS fallback: extract inner VP8/VP8L bitstream from the first ANMF chunk
    try {
      const buf = await Bun.file(inputPath).arrayBuffer();
      const u8 = new Uint8Array(buf);
      const view = new DataView(buf);
      if (u8.length < 12) return false;

      let offset = 12;
      while (offset + 8 <= u8.length) {
        const tag = String.fromCharCode(...u8.subarray(offset, offset + 4));
        const size = view.getUint32(offset + 4, true);
        const pOffset = offset + 8;

        if (tag === "ANMF" && size > 16 && pOffset + 16 <= u8.length) {
          const innerTag = String.fromCharCode(...u8.subarray(pOffset + 16, pOffset + 20));
          const innerSize = view.getUint32(pOffset + 20, true);

          if ((innerTag === "VP8 " || innerTag === "VP8L") && pOffset + 24 + innerSize <= u8.length) {
            const totalRiffSize = 4 + 8 + innerSize + (innerSize % 2);
            const frameData = new Uint8Array(8 + totalRiffSize);
            frameData.set(new TextEncoder().encode("RIFF"), 0);
            new DataView(frameData.buffer).setUint32(4, totalRiffSize, true);
            frameData.set(new TextEncoder().encode("WEBP"), 8);
            frameData.set(u8.subarray(pOffset + 16, pOffset + 16 + 8 + innerSize + (innerSize % 2)), 12);

            await Bun.write(outputPath, frameData);
            return true;
          }
        }
        offset += 8 + size + (size % 2);
      }
    } catch (e) {
      logger.error({ domain: "MEDIA", err: e, input: inputPath }, "Failed to extract first WebP frame");
    }

    return false;
  }

  /**
   * Probes a file using ffprobe and WebP header parsing to extract metadata.
   */
  static async probe(filePath: string): Promise<MediaMetadata> {
    const isWebPExt = extname(filePath).toLowerCase() === ".webp";
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
      // If ffprobe failed on a webp file, attempt direct WebP container parsing
      if (isWebPExt) {
        const webpInfo = await this.parseWebPInfo(filePath);
        if (webpInfo && webpInfo.width && webpInfo.height) {
          return {
            width: webpInfo.width,
            height: webpInfo.height,
            duration: webpInfo.duration,
            mimeType: "webp",
            isAnimated: webpInfo.isAnimated,
          };
        }
      }

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

      let width = stream?.width;
      let height = stream?.height;
      let duration = stream?.duration ? parseFloat(stream.duration) : (format?.duration ? parseFloat(format.duration) : undefined);
      let isAnimated: boolean | undefined = undefined;

      // Enrich WebP files (handles animated WebP where FFmpeg outputs width: 0 or fails to decode ANIM chunks)
      if (mimeType === "webp" || isWebPExt) {
        const webpInfo = await this.parseWebPInfo(filePath);
        if (webpInfo) {
          if (!width || width === 0) {
            width = webpInfo.width;
            height = webpInfo.height;
          }
          if (webpInfo.duration !== undefined && (!duration || webpInfo.duration > duration)) {
            duration = webpInfo.duration;
          }
          isAnimated = webpInfo.isAnimated;
          mimeType = "webp";
        }
      }

      return {
        width,
        height,
        duration,
        mimeType,
        isAnimated,
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
   * Generates a WebP thumbnail for an image, video, or animated WebP.
   */
  static async generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });

    const metadata = await this.probe(inputPath);
    const isWebP = metadata.mimeType === "webp" || extname(inputPath).toLowerCase() === ".webp";
    // Only treat as video if duration is significantly above 0 and it is not an animated image
    const isVideo = !isWebP && metadata.duration !== undefined && metadata.duration > 0.1;

    let sourcePath = inputPath;
    let tempFramePath: string | null = null;

    // Animated WebP handling: extract the first frame to static WebP so FFmpeg can resize it
    if (isWebP && metadata.isAnimated) {
      tempFramePath = join(dirname(outputPath), `temp-thumb-${crypto.randomUUID()}.webp`);
      const extracted = await this.extractFirstWebPFrame(inputPath, tempFramePath);
      if (extracted) {
        sourcePath = tempFramePath;
      }
    }

    const args = [
      CONFIG.FFMPEG_PATH,
      "-y", // Overwrite
    ];

    if (isVideo) {
      // For video, seek to 1 second, or 0 if video is too short
      const seekTime = (metadata.duration || 0) > 1 ? "00:00:01" : "00:00:00";
      args.push("-ss", seekTime);
    }

    args.push("-i", sourcePath);

    // Always force 1 frame to ensure a static thumbnail and save memory
    args.push("-vframes", "1");

    args.push(
      "-c:v", "libwebp", // Force static WebP encoder
      "-vf", "scale=300:-1:force_original_aspect_ratio=decrease",
      "-q:v", "75", // WebP quality
      outputPath
    );

    try {
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
    } finally {
      if (tempFramePath) {
        try {
          await unlink(tempFramePath);
        } catch {}
      }
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

    // For WebP (both static and animated), FFmpeg's "-c copy" fails on animated WebP
    // because FFmpeg cannot remux animated WebP streams. We strip metadata directly
    // by removing EXIF, XMP, and ICCP chunks from the RIFF container.
    if (extname(inputPath).toLowerCase() === ".webp") {
      const stripped = await this.stripWebPMetadata(inputPath, outputPath);
      if (stripped) return;
    }

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
