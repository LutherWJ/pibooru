import { stat, unlink } from "node:fs/promises";
import { join } from "node:path";

/**
 * delete_broken_posts.ts
 * Scans the database and DELETES any post where the original file or thumbnail is missing or 0 bytes.
 */

const args = Bun.argv.slice(2);
let dataDirOverride = "";
let confirm = args.includes("--confirm");

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-dir") dataDirOverride = args[++i];
}

if (dataDirOverride) {
    process.env.DATA_DIR = dataDirOverride;
}

const { db } = await import("../src/server/db");
const { MediaService } = await import("../src/server/services/MediaService");
const { PATHS } = await import("../src/server/util/paths");

async function run() {
    console.log("--- Starting Broken Post Purge ---");
    console.log(`Database: ${PATHS.DB}`);
    console.log(`Data Dir: ${PATHS.DATA}`);
    
    if (!confirm) {
        console.warn("\n[WARNING] This is a dry run. No files or database records will be deleted.");
        console.warn("Run with --confirm to actually delete the broken posts.\n");
    }

    const posts = db.query("SELECT id, hash, extension FROM posts").all() as any[];
    console.log(`Checking ${posts.length} posts...\n`);

    let brokenCount = 0;
    let deletedCount = 0;

    for (const post of posts) {
        const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
        const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

        let isBroken = false;
        let reason = "";

        // Check original
        try {
            const o = await stat(originalPath);
            if (o.size === 0) {
                isBroken = true;
                reason = "Original is 0 bytes";
            }
        } catch (e) {
            isBroken = true;
            reason = "Original is missing";
        }

        // Check thumbnail
        if (!isBroken) {
            try {
                const t = await stat(thumbPath);
                if (t.size === 0) {
                    isBroken = true;
                    reason = "Thumbnail is 0 bytes";
                }
            } catch (e) {
                isBroken = true;
                reason = "Thumbnail is missing";
            }
        }

        if (isBroken) {
            brokenCount++;
            console.log(`[BROKEN] Post ${post.id} (${post.hash}): ${reason}`);

            if (confirm) {
                try {
                    // Delete from database first
                    db.query("DELETE FROM posts WHERE id = ?").run(post.id);
                    
                    // Attempt to delete files (ignore errors if they already don't exist)
                    await unlink(originalPath).catch(() => {});
                    await unlink(thumbPath).catch(() => {});
                    
                    console.log(`  -> Deleted from DB and cleaned up files.`);
                    deletedCount++;
                } catch (e: any) {
                    console.error(`  -> Failed to delete: ${e.message}`);
                }
            }
        }
    }

    console.log("\n--- Purge Complete ---");
    console.log(`Total Posts Checked: ${posts.length}`);
    console.log(`Broken Posts Found:  ${brokenCount}`);
    if (confirm) {
        console.log(`Successfully Deleted: ${deletedCount}`);
    } else {
        console.log("Run with --confirm to execute the deletion.");
    }
}

run().catch(console.error);
