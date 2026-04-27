/**
 * regenerate_thumbnails.ts
 * Scans the database for posts missing thumbnails and generates them.
 * High-reliability version using Bun.file APIs.
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
    console.log("--- Starting High-Reliability Thumbnail Regeneration ---");
    console.log(`Database: ${PATHS.DB}`);
    console.log(`Data Dir: ${PATHS.DATA}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...\n`);

    const state = { fixed: 0, failed: 0, skipped: 0 };

    const processPost = async (post: any) => {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        const originalFile = Bun.file(originalPath);
        const thumbFile = Bun.file(thumbPath);

        let needsRegen = force;
        
        if (!needsRegen) {
            const exists = await thumbFile.exists();
            if (!exists || thumbFile.size === 0) {
                needsRegen = true;
            }
        }

        if (needsRegen) {
            try {
                // Verify original
                if (!(await originalFile.exists()) || originalFile.size === 0) {
                    throw new Error(`Original file missing or empty: ${originalPath}`);
                }

                await MediaService.generateThumbnail(originalPath, thumbPath);
                
                // Re-verify immediately
                const result = Bun.file(thumbPath);
                if (await result.exists() && result.size > 0) {
                    console.log(`[OK] Post ${post.id} -> ${result.size} bytes`);
                    state.fixed++;
                } else {
                    throw new Error("FFmpeg finished but result file is still invalid");
                }
            } catch (e: any) {
                console.error(`[FAIL] Post ${post.id}: ${e.message}`);
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
