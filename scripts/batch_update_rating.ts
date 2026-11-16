#!/usr/bin/env bun
/**
 * Script: batch_update_rating.ts
 * Allows batch-updating the content rating (s/q/e) of all uploaded posts in PiBooru.
 *
 * Usage:
 *   bun scripts/batch_update_rating.ts --rating <s|q|e> [--from <s|q|e>] [--dry-run]
 *
 * Examples:
 *   bun scripts/batch_update_rating.ts --rating e               # Set ALL posts to explicit
 *   bun scripts/batch_update_rating.ts --rating s --from q       # Change only questionable posts to safe
 *   bun scripts/batch_update_rating.ts --rating e --dry-run      # Preview changes without modifying DB
 */

import { parseArgs } from "node:util";
import { initDb, db } from "../src/server/db";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    rating: { type: "string", short: "r" },
    from: { type: "string", short: "f" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
  allowPositionals: false,
});

if (values.help || !values.rating) {
  console.log(`
PiBooru Batch Content Rating Updater
====================================
Usage:
  bun scripts/batch_update_rating.ts --rating <s|q|e> [options]

Options:
  -r, --rating <s|q|e>    Target rating: 's' (Safe), 'q' (Questionable), or 'e' (Explicit) [required]
  -f, --from <s|q|e>      Only update posts currently set to this rating [optional]
      --dry-run           Preview affected post counts without writing changes to the database
  -h, --help              Show this help message

Examples:
  bun scripts/batch_update_rating.ts --rating e
  bun scripts/batch_update_rating.ts --rating s --from q
  bun scripts/batch_update_rating.ts --rating q --dry-run
`);
  process.exit(values.help ? 0 : 1);
}

const targetRating = values.rating.toLowerCase();
if (!["s", "q", "e"].includes(targetRating)) {
  console.error(`Error: Invalid target rating '${values.rating}'. Must be 's', 'q', or 'e'.`);
  process.exit(1);
}

const fromRating = values.from ? values.from.toLowerCase() : null;
if (fromRating && !["s", "q", "e"].includes(fromRating)) {
  console.error(`Error: Invalid source rating '${values.from}'. Must be 's', 'q', or 'e'.`);
  process.exit(1);
}

await initDb();

// Current counts breakdown
const currentStats = db.query("SELECT rating, COUNT(*) as count FROM posts GROUP BY rating").all() as { rating: string; count: number }[];
const statsMap: Record<string, number> = { s: 0, q: 0, e: 0 };
let totalPosts = 0;
for (const row of currentStats) {
  statsMap[row.rating] = row.count;
  totalPosts += row.count;
}

console.log("\nCurrent Post Rating Distribution:");
console.log(`  Safe (s):         ${statsMap.s}`);
console.log(`  Questionable (q): ${statsMap.q}`);
console.log(`  Explicit (e):     ${statsMap.e}`);
console.log(`  Total Posts:      ${totalPosts}\n`);

if (totalPosts === 0) {
  console.log("No posts found in database. Exiting.");
  process.exit(0);
}

// Determine target posts
let countQuery = "SELECT COUNT(*) as count FROM posts";
const queryParams: any[] = [];
if (fromRating) {
  countQuery += " WHERE rating = ?";
  queryParams.push(fromRating);
}

const targetCountRow = db.query(countQuery).get(...queryParams) as { count: number };
const affectedCount = targetCountRow.count;

const ratingNames: Record<string, string> = {
  s: "Safe (s)",
  q: "Questionable (q)",
  e: "Explicit (e)",
};

if (values["dry-run"]) {
  console.log(`[DRY-RUN] Would update ${affectedCount} post(s) ${fromRating ? `from ${ratingNames[fromRating]} ` : ""}to ${ratingNames[targetRating]}.`);
  console.log("[DRY-RUN] Database was NOT modified.");
  process.exit(0);
}

// Perform update in a transaction
db.transaction(() => {
  if (fromRating) {
    db.prepare("UPDATE posts SET rating = ? WHERE rating = ?").run(targetRating, fromRating);
  } else {
    db.prepare("UPDATE posts SET rating = ?").run(targetRating);
  }
})();

console.log(`Successfully updated ${affectedCount} post(s) to ${ratingNames[targetRating]}!`);

// New distribution
const newStats = db.query("SELECT rating, COUNT(*) as count FROM posts GROUP BY rating").all() as { rating: string; count: number }[];
const newStatsMap: Record<string, number> = { s: 0, q: 0, e: 0 };
for (const row of newStats) {
  newStatsMap[row.rating] = row.count;
}

console.log("\nUpdated Post Rating Distribution:");
console.log(`  Safe (s):         ${newStatsMap.s}`);
console.log(`  Questionable (q): ${newStatsMap.q}`);
console.log(`  Explicit (e):     ${newStatsMap.e}`);
console.log(`  Total Posts:      ${totalPosts}\n`);
