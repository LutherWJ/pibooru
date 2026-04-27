import { db } from "../src/server/db";
import { PATHS } from "../src/server/util/paths";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

/**
 * find_orphaned_files.ts
 * Scans the data directory and checks if each file has a corresponding entry in the database.
 */

async function walk(dir: string, filelist: string[] = []): Promise<string[]> {
    const files = await readdir(dir);
    for (const file of files) {
        const filepath = join(dir, file);
        const s = await stat(filepath);
        if (s.isDirectory()) {
            filelist = await walk(filepath, filelist);
        } else {
            filelist.push(filepath);
        }
    }
    return filelist;
}

async function run() {
    console.log("--- Scanning Filesystem for Orphaned Files ---");

    const originalDir = join(PATHS.DATA, "original");
    const thumbsDir = join(PATHS.DATA, "thumbs");

    const dirsToCheck = [originalDir, thumbsDir];
    let totalFiles = 0;
    let orphans = 0;

    for (const dir of dirsToCheck) {
        console.log(`Scanning: ${dir}...`);
        try {
            const files = await walk(dir);
            totalFiles += files.length;

            for (const filepath of files) {
                // The filename is [hash].[ext]
                const filename = filepath.split('/').pop()!;
                const hash = filename.split('.')[0];
                
                // Check if hash exists in posts table
                const exists = db.query("SELECT 1 FROM posts WHERE hash = ?").get(hash);

                if (!exists) {
                    orphans++;
                    console.log(`[ORPHANED FILE] ${filepath}`);
                }
            }
        } catch (e: any) {
            console.error(`Error scanning ${dir}: ${e.message}`);
        }
    }

    console.log("--- Scan Complete ---");
    console.log(`Total Files Checked: ${totalFiles}`);
    console.log(`Orphaned Files Found: ${orphans}`);

    if (orphans > 0) {
        console.log("\nTo fix these, you may want to delete these files manually or re-import them.");
    }
}

run().catch(console.error);
