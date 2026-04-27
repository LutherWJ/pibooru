import { stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * regenerate_thumbnails.ts
 * Scans the database for posts missing thumbnails and generates them.
 */

const args = Bun.argv.slice(2);
let concurrency = 5;
let dataDirOverride = "";

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--concurrency") concurrency = parseInt(args[++i], 10);
    if (args[i] === "--data-dir") dataDirOverride = args[++i];
}

if (dataDirOverride) {
    process.env.DATA_DIR = dataDirOverride;
}

const { db } = await import("../src/server/db");
const { MediaService } = await import("../src/server/services/MediaService");
const { PATHS } = await import("../src/server/util/paths");

async function run() {
    console.log("--- Starting Thumbnail Regeneration (DEBUG MODE) ---");
    console.log(`Database: ${PATHS.DB}`);
    console.log(`Data Dir: ${PATHS.DATA}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...\n`);

    let debugCount = 0;
    const state = { missing: 0, regenerated: 0, failed: 0 };

    const processPost = async (post: any) => {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        if (debugCount < 10) {
            debugCount++;
            console.log(`[DEBUG] Post ${post.id}:`);
            console.log(`  Hash:   ${post.hash}`);
            console.log(`  Expect: ${thumbPath}`);
        }

        let shouldRegenerate = false;
        try {
            const s = await stat(thumbPath);
            if (s.size === 0) shouldRegenerate = true;
        } catch (e) {
            shouldRegenerate = true;
        }

        if (shouldRegenerate) {
            state.missing++;
            try {
                await stat(originalPath);
                await MediaService.generateThumbnail(originalPath, thumbPath);
                
                // VERIFY after fix
                const finalCheck = await stat(thumbPath);
                console.log(`[FIXED] Post ${post.id} (Size: ${finalCheck.size} bytes)`);
                state.regenerated++;
            } catch (e: any) {
                console.error(`[FAIL] Post ${post.id}: ${e.message}`);
                state.failed++;
            }
        }
    };

    const pool = new Set<Promise<void>>();
    for (const post of posts) {
        if (pool.size >= concurrency) await Promise.race(pool);
        const p = processPost(post);
        pool.add(p);
        p.finally(() => pool.delete(p));
    }
    await Promise.all(pool);

    console.log("\n--- Done ---");
    console.log(`Missing/Empty: ${state.missing}`);
    console.log(`Fixed:         ${state.regenerated}`);
}

run().catch(console.error);
