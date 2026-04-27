import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * find_orphaned_files.ts
 * Scans the data directory and checks if each file has a corresponding entry in the database.
 */

const args = Bun.argv.slice(2);
let dataDirOverride = "";
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-dir") dataDirOverride = args[++i];
}

if (dataDirOverride) process.env.DATA_DIR = dataDirOverride;

const { db } = await import("../src/server/db");
const { PATHS } = await import("../src/server/util/paths");

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
    console.log(`Database Path:  ${PATHS.DB}`);
    console.log(`Data Directory: ${PATHS.DATA}`);

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
                const filename = filepath.split('/').pop()!;
                const hash = filename.split('.')[0];
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
}

run().catch(console.error);
