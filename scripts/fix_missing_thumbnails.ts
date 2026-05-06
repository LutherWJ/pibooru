import { db } from "../src/server/db";
import { MediaService } from "../src/server/services/MediaService";
import { logger } from "../src/server/util/logger";

/**
 * Maintenance script to find and regenerate missing thumbnails.
 */
async function main() {
  logger.info({ domain: "MAINTENANCE" }, "Starting missing thumbnail regeneration");

  const posts = db.query("SELECT * FROM posts").all() as any[];
  logger.info({ domain: "MAINTENANCE", count: posts.length }, "Found posts to check");

  let fixedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const post of posts) {
    const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
    const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

    let needsRegen = false;
    try {
      const thumbFile = Bun.file(thumbPath);
      if (!(await thumbFile.exists()) || thumbFile.size === 0) {
        needsRegen = true;
      }
    } catch (e) {
      needsRegen = true;
    }

    if (needsRegen) {
      try {
        const originalFile = Bun.file(originalPath);
        if (!(await originalFile.exists())) {
          logger.error({ domain: "MAINTENANCE", postId: post.id, path: originalPath }, "Original file missing, cannot regenerate thumbnail");
          errorCount++;
          continue;
        }

        logger.info({ domain: "MAINTENANCE", postId: post.id }, "Regenerating thumbnail");
        await MediaService.generateThumbnail(originalPath, thumbPath);
        fixedCount++;
      } catch (e) {
        logger.error({ domain: "MAINTENANCE", postId: post.id, err: e }, "Failed to regenerate thumbnail");
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  logger.info({
    domain: "MAINTENANCE",
    total: posts.length,
    fixed: fixedCount,
    skipped: skippedCount,
    errors: errorCount
  }, "Thumbnail regeneration complete");
}

main().catch(e => {
  logger.error({ domain: "MAINTENANCE", err: e }, "Fatal error during thumbnail regeneration");
  process.exit(1);
});
