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

// CRITICAL: Set the environment variable BEFORE importing the DB or PATHS
if (dataDirOverride) {
    process.env.DATA_DIR = dataDirOverride;
}

// Now import the rest of the app
const { db } = await import("../src/server/db");
const { MediaService } = await import("../src/server/services/MediaService");
const { PATHS } = await import("../src/server/util/paths");

async function run() {
    console.log("--- Starting Thumbnail Regeneration ---");
    console.log(`Working Root:    ${PATHS.ROOT}`);
    console.log(`Database Path:   ${PATHS.DB}`);
    console.log(`Data Directory:  ${PATHS.DATA}`);
    console.log(`Concurrency:     ${concurrency}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...`);

    if (posts.length === 0) {
        console.log("No posts found in database. Is the Data Directory correct?");
        return;
    }

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
                    console.error(`[FAIL] Post ${post.id}: Original file is 0 bytes.`);
                    state.failed++;
                    return;
                }

                await MediaService.generateThumbnail(originalPath, thumbPath);
                console.log(`[FIXED] Post ${post.id}`);
                state.regenerated++;
            } catch (e: any) {
                console.error(`[FAIL] Post ${post.id}: ${e.code === 'ENOENT' ? 'Original missing' : e.message}`);
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
