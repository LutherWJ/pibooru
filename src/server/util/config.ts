import { z } from "zod";
import { logger } from "./logger";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters long"),
  DATA_DIR: z.string().default("./data"),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
});

/**
 * Validates the environment variables on startup.
 * The process will exit if the configuration is invalid.
 */
function validateConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error("CONFIG", "Invalid environment configuration", {
      issues: result.error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    process.exit(1);
  }

  // Robustness check: Ensure FFmpeg/FFprobe binaries exist
  const ffmpegPath = Bun.which(result.data.FFMPEG_PATH);
  const ffprobePath = Bun.which(result.data.FFPROBE_PATH);

  if (!ffmpegPath) {
    logger.error("CONFIG", `FFmpeg binary not found at path: ${result.data.FFMPEG_PATH}`);
    process.exit(1);
  }

  if (!ffprobePath) {
    logger.error("CONFIG", `FFprobe binary not found at path: ${result.data.FFPROBE_PATH}`);
    process.exit(1);
  }

  return result.data;
}

export const CONFIG = validateConfig();
