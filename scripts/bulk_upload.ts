import { readdir } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { stat } from "node:fs/promises";

/**
 * MyBooru Bulk Upload Script - API Key Version
 */

const args = Bun.argv.slice(2);
const params = {
    dir: "",
    tags: "",
    apiKey: "",
    url: "http://localhost:3000",
    concurrency: 5,
    rating: "s",
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir") params.dir = args[++i];
    else if (args[i] === "--tags") params.tags = args[++i];
    else if (args[i] === "--api-key") params.apiKey = args[++i];
    else if (args[i] === "--url") params.url = args[++i];
    else if (args[i] === "--concurrency") params.concurrency = parseInt(args[++i], 10);
    else if (args[i] === "--rating") params.rating = args[++i];
}

if (!params.dir || !params.apiKey) {
    console.error("Missing required arguments: --dir, --api-key");
    console.log("Usage: bun bulk_upload.ts --dir <path> --tags <tags> --api-key <key> [--url <url>] [--concurrency <n>] [--rating <s|q|e>]");
    process.exit(1);
}

async function run() {
    const baseUrl = params.url.replace(/\/$/, '');
    const absoluteDir = resolve(params.dir);
    
    console.log(`--- Bulk Upload Started ---`);
    console.log(`Target URL: ${baseUrl}`);
    console.log(`Source Dir: ${absoluteDir}`);

    // 1. Scan Directory First
    console.log("Scanning directory for media files...");
    let allFiles: string[] = [];
    try {
        allFiles = await readdir(absoluteDir);
    } catch (e: any) {
        console.error(`Failed to read directory: ${e.message}`);
        process.exit(1);
    }

    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm'];
    const filesToUpload = [];

    for (const file of allFiles) {
        const filePath = join(absoluteDir, file);
        try {
            const s = await stat(filePath);
            if (s.isFile() && mediaExtensions.includes(extname(file).toLowerCase())) {
                filesToUpload.push(filePath);
            }
        } catch (e) {}
    }

    if (filesToUpload.length === 0) {
        console.error("No supported media files found in the specified directory.");
        process.exit(1);
    }
    console.log(`Found ${filesToUpload.length} media files to upload.`);

    console.log("Starting uploads with API key...");

    // 2. Upload
    const results = { success: 0, failed: 0, skipped: 0 };

    const uploadFile = async (filePath: string) => {
        const fileName = filePath.split('/').pop()!;
        try {
            const formData = new FormData();
            const fileBlob = Bun.file(filePath);
            formData.append("file", fileBlob, fileName);
            formData.append("tags", params.tags);
            formData.append("rating", params.rating);

            const res = await fetch(`${baseUrl}/upload`, {
                method: "POST",
                body: formData,
                headers: {
                    "Authorization": `Bearer ${params.apiKey}`,
                    "X-MyBooru-Uploader": "true",
                    "Accept": "application/json",
                    "User-Agent": "MyBooru-BulkUploader/1.0"
                }
            });

            if (res.ok) {
                const data = await res.json() as any;
                if (data.alreadyExists) {
                    console.log(`[SKIPPED] ${fileName}`);
                    results.skipped++;
                } else {
                    console.log(`[OK] ${fileName}`);
                    results.success++;
                }
            } else {
                console.error(`[FAILED] ${fileName}: ${res.status}`);
                const text = await res.text();
                console.error("Response:", text.substring(0, 200));
                results.failed++;
            }
        } catch (error) {
            console.error(`[ERROR] ${fileName}:`, error);
            results.failed++;
        }
    };

    const pool = new Set<Promise<void>>();
    for (const file of filesToUpload) {
        if (pool.size >= params.concurrency) await Promise.race(pool);
        const p = uploadFile(file);
        pool.add(p);
        p.finally(() => pool.delete(p));
    }
    await Promise.all(pool);

    console.log(`\nDone! Success: ${results.success}, Skipped: ${results.skipped}, Failed: ${results.failed}`);
}

run().catch(console.error);
