import { Database } from "bun:sqlite";
import { PATHS } from "../src/server/util/paths";
import { TagModel } from "../src/server/models/Tag";
import { PostModel } from "../src/server/models/Post";

async function fix() {
  const db = new Database(PATHS.DB);
  console.log("Connected to database:", PATHS.DB);

  // 1. Diagnostics
  const postCount = db.query("SELECT COUNT(*) as count FROM posts").get() as { count: number };
  const tagCount = db.query("SELECT COUNT(*) as count FROM tags").get() as { count: number };
  const associationCount = db.query("SELECT COUNT(*) as count FROM post_tags").get() as { count: number };

  console.log(`Current State:
  - Total Posts: ${postCount.count}
  - Total Tags: ${tagCount.count}
  - Total Associations (post_tags): ${associationCount.count}`);

  if (associationCount.count === 0 && postCount.count > 0) {
    console.warn("\nWARNING: All post-tag associations have been lost!");
  }

  // 2. Sync post_count in tags table
  console.log("\nSyncing post_count in tags table...");
  db.transaction(() => {
    // Reset all counts to 0
    db.run("UPDATE tags SET post_count = 0");
    
    // Recalculate from post_tags
    db.run(`
      UPDATE tags 
      SET post_count = (
        SELECT COUNT(*) 
        FROM post_tags 
        WHERE post_tags.tag_id = tags.id
      )
    `);
  })();
  console.log("post_count synced.");

  // 3. Optional Recovery: Re-tag all untagged posts with 'tagme'
  // Only do this if tagme was previously a thing or if many posts are untagged
  const untaggedCount = db.query(`
    SELECT COUNT(*) as count 
    FROM posts 
    WHERE NOT EXISTS (SELECT 1 FROM post_tags WHERE post_id = posts.id)
  `).get() as { count: number };

  console.log(`Untagged posts: ${untaggedCount.count}`);

  if (untaggedCount.count > 0) {
    const tagmeTag = db.query("SELECT * FROM tags WHERE name = 'tagme'").get() as any;
    
    if (tagmeTag) {
      console.log(`\nFound 'tagme' tag (ID: ${tagmeTag.id}).`);
      console.log(`Would you like to re-tag all ${untaggedCount.count} untagged posts with 'tagme'?`);
      console.log("This will restore searchability for these posts.");
      
      // Since this is a script, we'll check for a flag --restore-tagme
      if (process.argv.includes("--restore-tagme")) {
        console.log("Restoring 'tagme' associations...");
        db.transaction(() => {
          const posts = db.query("SELECT id FROM posts WHERE NOT EXISTS (SELECT 1 FROM post_tags WHERE post_id = posts.id)").all() as { id: number }[];
          const insert = db.prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)");
          for (const post of posts) {
            insert.run(post.id, tagmeTag.id);
          }
          // Sync again
          db.run("UPDATE tags SET post_count = (SELECT COUNT(*) FROM post_tags WHERE post_tags.tag_id = tags.id) WHERE id = ?", [tagmeTag.id]);
        })();
        console.log(`Successfully re-tagged ${untaggedCount.count} posts with 'tagme'.`);
      } else {
        console.log("Skipping 'tagme' restoration. Run with --restore-tagme to perform this action.");
      }
    }
  }

  db.close();
}

fix().catch(console.error);
