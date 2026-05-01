import { db } from "../src/server/db";
import { MediaService } from "../src/server/services/MediaService";
import { logger } from "../src/server/util/logger";

/**
 * Maintenance script to find and regenerate missing thumbnails.
 */
async function main() {
  logger.info("MAINTENANCE", "Starting missing thumbnail regeneration...");

  const posts = db.query("SELECT * FROM posts").all() as any[];
  logger.info("MAINTENANCE", `Found ${posts.length} posts to check.`);

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
          logger.error("MAINTENANCE", `Original file missing for post ${post.id}, cannot regenerate thumbnail.`, { path: originalPath });
          errorCount++;
          continue;
        }

        logger.info("MAINTENANCE", `Regenerating thumbnail for post ${post.id}...`);
        await MediaService.generateThumbnail(originalPath, thumbPath);
        fixedCount++;
      } catch (e) {
        logger.error("MAINTENANCE", `Failed to regenerate thumbnail for post ${post.id}`, { error: e });
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  logger.info("MAINTENANCE", "Thumbnail regeneration complete.", {
    total: posts.length,
    fixed: fixedCount,
    skipped: skippedCount,
    errors: errorCount
  });
}

main().catch(e => {
  logger.error("MAINTENANCE", "Fatal error during thumbnail regeneration", { error: e });
  process.exit(1);
});
