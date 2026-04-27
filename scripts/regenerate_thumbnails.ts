import { stat, unlink } from "node:fs/promises";
import { join } from "node:path";

/**
 * regenerate_thumbnails.ts
 * Scans the database for posts missing thumbnails and generates them.
 */

const args = Bun.argv.slice(2);
let concurrency = 5;
let dataDirOverride = "";
let force = args.includes("--force");

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
    console.log("--- Starting Thumbnail Regeneration ---");
    console.log(`Database: ${PATHS.DB}`);
    console.log(`Data Dir: ${PATHS.DATA}`);
    console.log(`Force:    ${force}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...\n`);

    const state = { total: 0, fixed: 0, failed: 0, skipped: 0 };

    const processPost = async (post: any) => {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        let needsRegen = force;
        
        if (!needsRegen) {
            try {
                const s = await stat(thumbPath);
                if (s.size === 0) {
                    needsRegen = true;
                    await unlink(thumbPath).catch(() => {});
                }
            } catch (e) {
                needsRegen = true;
            }
        }

        if (needsRegen) {
            state.total++;
            try {
                // Verify original
                const o = await stat(originalPath);
                if (o.size === 0) throw new Error("Original file is 0 bytes");

                await MediaService.generateThumbnail(originalPath, thumbPath);
                
                // CRITICAL: Stat it immediately to see what happened
                const check = await stat(thumbPath);
                if (check.size > 0) {
                    console.log(`[OK] Post ${post.id} (${check.size} bytes)`);
                    state.fixed++;
                } else {
                    console.error(`[FAIL] Post ${post.id}: FFmpeg reported success but file is 0 bytes!`);
                    state.failed++;
                }
            } catch (e: any) {
                console.error(`[ERR] Post ${post.id}: ${e.message}`);
                state.failed++;
            }
        } else {
            state.skipped++;
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

    console.log("\n--- Summary ---");
    console.log(`Fixed:   ${state.fixed}`);
    console.log(`Failed:  ${state.failed}`);
    console.log(`Skipped: ${state.skipped}`);
}

run().catch(console.error);
