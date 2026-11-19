#!/usr/bin/env bun
/**
 * Script: client_update_ratings_to_explicit.ts
 * Client-side script that queries all posts not rated as explicit (s/q),
 * and requests the server to update their ratings to explicit ('e').
 *
 * Can be run from Bun or Node on a client machine using an API key or session cookie.
 *
 * Usage:
 *   bun scripts/client_update_ratings_to_explicit.ts --url <URL> [--api-key <KEY>] [--cookie <COOKIE>] [--concurrency 5] [--dry-run]
 *
 * Example:
 *   bun scripts/client_update_ratings_to_explicit.ts --url http://127.0.0.1:3001 --api-key my-api-token
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    url: { type: "string", short: "u", default: "http://localhost:3001" },
    "api-key": { type: "string", short: "k" },
    cookie: { type: "string", short: "c" },
    concurrency: { type: "string", default: "5" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
  allowPositionals: false,
});

if (values.help) {
  console.log(`
MyBooru Client-Side Rating Updater
==================================
Queries posts not rated explicit and updates them to explicit ('e').

Options:
  -u, --url <url>          Target MyBooru base URL (default: http://localhost:3001)
  -k, --api-key <key>      API key for Bearer authentication
  -c, --cookie <cookie>    Session cookie (e.g. "session_id=...")
      --concurrency <n>    Concurrent update requests (default: 5)
      --dry-run            Scan and list post IDs without modifying them
  -h, --help               Show this help message

Examples:
  bun scripts/client_update_ratings_to_explicit.ts --url http://127.0.0.1:3001 --api-key YOUR_KEY
  bun scripts/client_update_ratings_to_explicit.ts --url https://booru.mydomain.com --cookie "session_id=..."
`);
  process.exit(0);
}

const baseUrl = values.url.replace(/\/$/, "");
const concurrency = parseInt(values.concurrency, 10) || 5;
const isDryRun = values["dry-run"];

const headers: Record<string, string> = {
  "User-Agent": "MyBooru-ClientRatingUpdater/1.0",
};

if (values["api-key"]) {
  headers["Authorization"] = `Bearer ${values["api-key"]}`;
} else if (values.cookie) {
  headers["Cookie"] = values.cookie;
}

/**
 * Extracts post IDs from rendered HTML (from data-post-id or /post/:id links)
 */
function extractPostIds(html: string): number[] {
  const ids = new Set<number>();
  // Match data-post-id="123"
  const dataPostMatches = html.matchAll(/data-post-id="(\d+)"/g);
  for (const match of dataPostMatches) {
    ids.add(parseInt(match[1], 10));
  }
  // Match href="/post/123"
  const hrefMatches = html.matchAll(/href="\/post\/(\d+)"/g);
  for (const match of hrefMatches) {
    ids.add(parseInt(match[1], 10));
  }
  return Array.from(ids);
}

/**
 * Fetches all post IDs for a given rating search filter
 */
async function fetchPostIdsForRating(ratingFilter: "s" | "q"): Promise<number[]> {
  const postIds: number[] = [];
  const seenOnThisRating = new Set<number>();
  let page = 1;
  let cursor: number | null = null;

  console.log(`Scanning posts with rating '${ratingFilter}'...`);

  while (true) {
    const url = cursor
      ? `${baseUrl}/?tags=rating:${ratingFilter}&page=b${cursor}`
      : `${baseUrl}/?tags=rating:${ratingFilter}&page=${page}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch page (${res.status}): ${url}`);
      break;
    }

    const html = await res.text();
    const batch = extractPostIds(html);
    const newInBatch = batch.filter((id) => !seenOnThisRating.has(id));

    if (newInBatch.length === 0) {
      break; // No more posts found
    }

    for (const id of newInBatch) {
      seenOnThisRating.add(id);
      postIds.push(id);
    }

    // Use cursor for the next iteration if possible (lowest id seen in batch)
    cursor = Math.min(...newInBatch);
    page++;
    process.stdout.write(`\rFound ${postIds.length} posts with rating '${ratingFilter}' so far...`);
  }

  console.log(`\nTotal posts found with rating '${ratingFilter}': ${postIds.length}`);
  return postIds;
}

/**
 * Sends request to update a post's rating to 'e'
 */
async function updatePostRatingToExplicit(postId: number): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append("rating", "e");

  try {
    const res = await fetch(`${baseUrl}/post/${postId}/rating`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        "HX-Request": "true",
      },
      body: formData.toString(),
    });

    return res.ok || res.status === 302;
  } catch (err: any) {
    console.error(`Error updating post ${postId}:`, err.message);
    return false;
  }
}

async function run() {
  console.log("=== MyBooru Client Rating Updater ===");
  console.log(`Target: ${baseUrl}`);
  if (isDryRun) console.log("[DRY-RUN MODE: No changes will be saved]");

  // 1. Gather all posts with rating 's' (Safe) and 'q' (Questionable)
  const safeIds = await fetchPostIdsForRating("s");
  const questionableIds = await fetchPostIdsForRating("q");

  const allTargetIds = Array.from(new Set([...safeIds, ...questionableIds])).sort((a, b) => b - a);
  console.log(`\nTotal posts to update to Explicit ('e'): ${allTargetIds.length}`);

  if (allTargetIds.length === 0) {
    console.log("All posts are already rated explicit or no posts were found!");
    return;
  }

  if (isDryRun) {
    console.log("\n[DRY-RUN] The following post IDs would be updated to explicit:");
    console.log(allTargetIds.join(", "));
    return;
  }

  // 2. Perform concurrent batch updates
  let completed = 0;
  let succeeded = 0;
  let failed = 0;

  const pool = new Set<Promise<void>>();

  for (const id of allTargetIds) {
    const task = (async () => {
      const ok = await updatePostRatingToExplicit(id);
      completed++;
      if (ok) succeeded++;
      else failed++;
      process.stdout.write(
        `\rProgress: ${completed}/${allTargetIds.length} (OK: ${succeeded}, Failed: ${failed})`
      );
    })();

    pool.add(task);
    task.finally(() => pool.delete(task));

    if (pool.size >= concurrency) {
      await Promise.race(pool);
    }
  }

  await Promise.all(pool);
  console.log(`\n\nDone! Successfully updated ${succeeded} posts to explicit. Failed: ${failed}.`);
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
