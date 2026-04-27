import { db } from "../src/server/db";
import { MediaService } from "../src/server/services/MediaService";
import { exists } from "node:fs/promises";

/**
 * regenerate_thumbnails.ts
 * Scans the database for posts missing thumbnails and generates them.
 */

async function run() {
    console.log("--- Starting Thumbnail Regeneration ---");
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...`);

    let missing = 0;
    let regenerated = 0;
    let failed = 0;

    for (const post of posts) {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        const thumbExists = await exists(thumbPath);

        if (!thumbExists) {
            missing++;
            process.stdout.write(`[MISSING] Post ${post.id}: Regenerating... `);
            
            try {
                const originalExists = await exists(originalPath);
                if (!originalExists) {
                    console.log("FAILED (Original file missing)");
                    failed++;
                    continue;
                }

                await MediaService.generateThumbnail(originalPath, thumbPath);
                console.log("OK");
                regenerated++;
            } catch (e: any) {
                console.log(`FAILED (${e.message})`);
                failed++;
            }
        }
    }

    console.log("\n--- Regeneration Complete ---");
    console.log(`Total Posts Checked: ${posts.length}`);
    console.log(`Missing Thumbnails:  ${missing}`);
    console.log(`Successfully Fixed:  ${regenerated}`);
    console.log(`Failed to Fix:      ${failed}`);
}

run().catch(console.error);
