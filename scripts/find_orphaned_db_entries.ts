import { exists } from "node:fs/promises";

/**
 * find_orphaned_db_entries.ts
 * Scans the database and checks if the corresponding files exist on disk.
 */

const args = Bun.argv.slice(2);
let dataDirOverride = "";
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-dir") dataDirOverride = args[++i];
}

if (dataDirOverride) process.env.DATA_DIR = dataDirOverride;

const { db } = await import("../src/server/db");
const { MediaService } = await import("../src/server/services/MediaService");
const { PATHS } = await import("../src/server/util/paths");

async function run() {
    console.log("--- Scanning Database for Orphaned Entries ---");
    console.log(`Database Path:  ${PATHS.DB}`);
    console.log(`Data Directory: ${PATHS.DATA}`);
    
    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} database entries...`);

    let orphans = 0;

    for (const post of posts) {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        const originalExists = await exists(originalPath);
        const thumbExists = await exists(thumbPath);

        if (!originalExists || !thumbExists) {
            orphans++;
            console.log(`[ORPHANED] Post ID: ${post.id}`);
            if (!originalExists) console.log(`  - Missing Original: ${originalPath}`);
            if (!thumbExists) console.log(`  - Missing Thumbnail: ${thumbPath}`);
            console.log("");
        }
    }

    console.log("--- Scan Complete ---");
    console.log(`Total Posts Checked: ${posts.length}`);
    console.log(`Orphaned Entries Found: ${orphans}`);
}

run().catch(console.error);
