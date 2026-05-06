import { db } from "../src/server/db";
import { PostModel } from "../src/server/models/Post";
import { TagModel } from "../src/server/models/Tag";
import { logger } from "../src/server/util/logger";

/**
 * Maintenance script to retroactively apply tag implications to all posts.
 */
async function main() {
  logger.info({ domain: "MAINTENANCE" }, "Starting retroactive tag implication application");

  const posts = db.query("SELECT id FROM posts").all() as { id: number }[];
  logger.info({ domain: "MAINTENANCE", count: posts.length }, "Found posts to process");

  let updatedCount = 0;

  for (const post of posts) {
    const currentTags = PostModel.getTags(post.id);
    const currentTagIds = currentTags.map(t => t.id);
    
    const expandedTagIds = TagModel.getAllImpliedTagIds(currentTagIds);

    if (expandedTagIds.length > currentTagIds.length) {
      // Something was added
      db.transaction(() => {
        const newIds = new Set(expandedTagIds);
        const oldIds = new Set(currentTagIds);

        for (const tagId of newIds) {
          if (!oldIds.has(tagId)) {
            if (TagModel.linkToPost(post.id, tagId)) {
              TagModel.incrementCount(tagId);
            }
          }
        }
      })();
      updatedCount++;
    }
  }

  logger.info({ domain: "MAINTENANCE", updatedCount }, "Finished updating posts");
}

main().catch(e => {
  logger.error({ domain: "MAINTENANCE", err: e }, "Failed to apply implications");
  process.exit(1);
});
