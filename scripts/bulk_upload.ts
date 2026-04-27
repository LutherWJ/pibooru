import { readdir } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { stat } from "node:fs/promises";

/**
 * MyBooru Bulk Upload Script - Debug Version
 */

const args = Bun.argv.slice(2);
const params = {
    dir: "",
    tags: "",
    username: "",
    password: "",
    url: "http://localhost:3000",
    concurrency: 5,
    rating: "s",
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir") params.dir = args[++i];
    else if (args[i] === "--tags") params.tags = args[++i];
    else if (args[i] === "--username") params.username = args[++i];
    else if (args[i] === "--password") params.password = args[++i];
    else if (args[i] === "--url") params.url = args[++i];
    else if (args[i] === "--concurrency") params.concurrency = parseInt(args[++i], 10);
    else if (args[i] === "--rating") params.rating = args[++i];
}

if (!params.dir || !params.username || !params.password) {
    console.error("Missing required arguments: --dir, --username, --password");
    console.log("Usage: bun bulk_upload.ts --dir <path> --tags <tags> --username <user> --password <pass> [--url <url>] [--concurrency <n>] [--rating <s|q|e>]");
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

    // 2. Login
    console.log(`Attempting login for user: ${params.username}...`);
    const loginFormData = new FormData();
    loginFormData.append("username", params.username);
    loginFormData.append("password", params.password);

    const loginRes = await fetch(`${baseUrl}/login`, {
        method: "POST",
        body: loginFormData,
        redirect: "manual",
        headers: {
            "Origin": baseUrl,
            "Referer": `${baseUrl}/login`,
            "X-MyBooru-Uploader": "true",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    });

    if (loginRes.status >= 400) {
        console.error(`Login failed with status ${loginRes.status}`);
        const text = await loginRes.text();
        console.error("Response:", text.substring(0, 500));
        process.exit(1);
    }

    const setCookie = loginRes.headers.get("set-cookie");
    if (!setCookie) {
        console.error(`Login failed: No session cookie received (Status: ${loginRes.status})`);
        process.exit(1);
    }

    const sessionIdMatch = setCookie.match(/session_id=([^;]+)/);
    if (!sessionIdMatch) {
        console.error("Login failed: session_id not found in cookie.");
        process.exit(1);
    }
    const cookie = `session_id=${sessionIdMatch[1]}`;
    console.log("Login successful. Starting uploads...");

    // 3. Upload
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
                    "Cookie": `session_id=${sessionIdMatch[1]}`,
                    "Origin": baseUrl,
                    "Referer": `${baseUrl}/upload`,
                    "X-MyBooru-Uploader": "true",
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
