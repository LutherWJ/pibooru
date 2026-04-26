import { z } from "zod";

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
    console.error("Invalid environment configuration:");
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const CONFIG = validateConfig();
