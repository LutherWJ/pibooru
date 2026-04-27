import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { MediaService } from "./MediaService";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG } from "../util/config";

const TEST_DIR = join(process.cwd(), "data", "test_media");
const SAMPLE_IMAGE = join(TEST_DIR, "sample.jpg");
const SAMPLE_VIDEO = join(TEST_DIR, "sample.mp4");
const THUMB_OUTPUT = join(TEST_DIR, "thumb.webp");

describe("MediaService (FFmpeg)", () => {
  
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });

    // Generate a 2000x2000 red JPG for testing (catches memory/encoder issues)
    const imgProc = Bun.spawn([
      CONFIG.FFMPEG_PATH, "-y",
      "-f", "lavfi", "-i", "color=c=red:s=2000x2000",
      "-frames:v", "1",
      SAMPLE_IMAGE
    ]);
    await imgProc.exited;

    // Generate a 1-second 640x480 black MP4 for testing
    const vidProc = Bun.spawn([
      CONFIG.FFMPEG_PATH, "-y",
      "-f", "lavfi", "-i", "color=c=black:s=640x480",
      "-t", "1",
      "-pix_fmt", "yuv420p",
      SAMPLE_VIDEO
    ]);
    await vidProc.exited;
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should probe an image correctly", async () => {
    const meta = await MediaService.probe(SAMPLE_IMAGE);
    expect(meta.width).toBe(2000);
    expect(meta.height).toBe(2000);
    // Images might have a tiny duration (e.g. 0.04 for MJPEG)
    if (meta.duration !== undefined) {
      expect(meta.duration).toBeLessThanOrEqual(0.1);
    }
  });

  it("should probe a video correctly", async () => {
    const meta = await MediaService.probe(SAMPLE_VIDEO);
    expect(meta.width).toBe(640);
    expect(meta.height).toBe(480);
    expect(meta.duration).toBeGreaterThan(0);
  });

  it("should generate a WebP thumbnail for an image", async () => {
    await MediaService.generateThumbnail(SAMPLE_IMAGE, THUMB_OUTPUT);
    const stats = await stat(THUMB_OUTPUT);
    expect(stats.size).toBeGreaterThan(0);
    
    // Verify it is a WebP
    const meta = await MediaService.probe(THUMB_OUTPUT);
    expect(meta.mimeType).toBe("webp");
  });

  it("should generate a WebP thumbnail for a video", async () => {
    const videoThumb = join(TEST_DIR, "video_thumb.webp");
    await MediaService.generateThumbnail(SAMPLE_VIDEO, videoThumb);
    const stats = await stat(videoThumb);
    expect(stats.size).toBeGreaterThan(0);

    const meta = await MediaService.probe(videoThumb);
    expect(meta.mimeType).toBe("webp");
  });

  it("should throw an error for invalid files", async () => {
    const invalidFile = join(TEST_DIR, "invalid.txt");
    await Bun.write(invalidFile, "not a media file");
    
    await expect(MediaService.probe(invalidFile)).rejects.toThrow();
  });

  it("should calculate correct sharded paths", () => {
    const hash = "a1b2c3d4e5f6";
    const path = MediaService.getShardedPath("original", hash, ".jpg");
    // Should contain /original/a1/b2/a1b2c3d4e5f6.jpg
    expect(path).toContain(join("original", "a1", "b2", "a1b2c3d4e5f6.jpg"));
  });
});
