import { db } from "../src/server/db";
import { MediaService } from "../src/server/services/MediaService";
import { PATHS } from "../src/server/util/paths";
import { stat } from "node:fs/promises";

/**
 * regenerate_thumbnails.ts
 * Scans the database for posts missing thumbnails and generates them.
 */

async function run() {
    console.log("--- Starting Thumbnail Regeneration ---");
    console.log(`Data Directory: ${PATHS.DATA}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...`);

    let missing = 0;
    let regenerated = 0;
    let failed = 0;
    let corrupted = 0;

    for (const post of posts) {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        let shouldRegenerate = false;
        
        try {
            const s = await stat(thumbPath);
            if (s.size === 0) {
                shouldRegenerate = true;
                corrupted++;
            }
        } catch (e) {
            // File doesn't exist
            shouldRegenerate = true;
        }

        if (shouldRegenerate) {
            missing++;
            process.stdout.write(`[REGEN] Post ${post.id} (${post.hash.slice(0, 8)})... `);
            
            try {
                // Verify original exists
                const o = await stat(originalPath);
                if (o.size === 0) {
                    console.log("FAILED (Original file is 0 bytes)");
                    failed++;
                    continue;
                }

                await MediaService.generateThumbnail(originalPath, thumbPath);
                console.log("OK");
                regenerated++;
            } catch (e: any) {
                console.log(`FAILED (${e.code === 'ENOENT' ? 'Original missing' : e.message})`);
                failed++;
            }
        }
    }

    console.log("\n--- Regeneration Complete ---");
    console.log(`Total Posts Checked: ${posts.length}`);
    console.log(`Empty/Missing:      ${missing}`);
    console.log(`Successfully Fixed:  ${regenerated}`);
    console.log(`Failed to Fix:      ${failed}`);
}

run().catch(console.error);
