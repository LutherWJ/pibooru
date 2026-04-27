import { db } from "../src/server/db";
import { MediaService } from "../src/server/services/MediaService";
import { PATHS } from "../src/server/util/paths";
import { stat } from "node:fs/promises";

/**
 * regenerate_thumbnails.ts
 * Scans the database for posts missing thumbnails and generates them.
 */

const args = Bun.argv.slice(2);
let concurrency = 5;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--concurrency") concurrency = parseInt(args[++i], 10);
}

async function run() {
    console.log("--- Starting Thumbnail Regeneration ---");
    console.log(`Data Directory: ${PATHS.DATA}`);
    console.log(`Concurrency:    ${concurrency}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...`);

    const state = {
        missing: 0,
        regenerated: 0,
        failed: 0,
        corrupted: 0
    };

    const processPost = async (post: any) => {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        let shouldRegenerate = false;
        try {
            const s = await stat(thumbPath);
            if (s.size === 0) {
                shouldRegenerate = true;
                state.corrupted++;
            }
        } catch (e) {
            shouldRegenerate = true;
        }

        if (shouldRegenerate) {
            state.missing++;
            try {
                const o = await stat(originalPath);
                if (o.size === 0) {
                    console.error(`[ERROR] Post ${post.id}: Original file is 0 bytes.`);
                    state.failed++;
                    return;
                }

                await MediaService.generateThumbnail(originalPath, thumbPath);
                console.log(`[FIXED] Post ${post.id}`);
                state.regenerated++;
            } catch (e: any) {
                console.error(`[FAILED] Post ${post.id}: ${e.code === 'ENOENT' ? 'Original missing' : e.message}`);
                state.failed++;
            }
        }
    };

    const pool = new Set<Promise<void>>();
    for (const post of posts) {
        if (pool.size >= concurrency) {
            await Promise.race(pool);
        }
        const p = processPost(post);
        pool.add(p);
        p.finally(() => pool.delete(p));
    }
    await Promise.all(pool);

    console.log("\n--- Regeneration Complete ---");
    console.log(`Total Posts Checked: ${posts.length}`);
    console.log(`Empty/Missing:      ${state.missing}`);
    console.log(`Successfully Fixed:  ${state.regenerated}`);
    console.log(`Failed to Fix:      ${state.failed}`);
}

run().catch(console.error);
