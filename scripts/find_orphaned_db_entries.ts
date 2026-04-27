import { db } from "../src/server/db";
import { MediaService } from "../src/server/services/MediaService";
import { exists } from "node:fs/promises";

/**
 * find_orphaned_db_entries.ts
 * Scans the database and checks if the corresponding files exist on disk.
 */

async function run() {
    console.log("--- Scanning Database for Orphaned Entries ---");
    
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
    
    if (orphans > 0) {
        console.log("\nTo fix these, you may need to delete the database records or re-upload the files.");
    }
}

run().catch(console.error);
