#!/usr/bin/env bun
/**
 * Script: rehash_and_deduplicate.ts
 *
 * Scans every media file on disk, recalculates its true SHA-256 hash (metadata-free content),
 * updates post records in the database, moves files to their correct sharded paths,
 * and eliminates duplicate posts from newest to oldest (keeping the newest post and deleting older duplicates).
 *
 * Usage:
 *   bun scripts/rehash_and_deduplicate.ts [options]
 *
 * Options:
 *   --confirm              Actually perform moves, updates, and deletions (default is dry-run)
 *   --dry-run              Preview changes without modifying DB or filesystem (default)
 *   --data-dir <path>      Override DATA_DIR path (default: process.env.DATA_DIR || "./data")
 *   --no-merge-tags        Do not merge tags from older duplicates into the kept post
 *   -h, --help             Show this help message
 *
 * Examples:
 *   bun scripts/rehash_and_deduplicate.ts                     # Safe preview (dry-run)
 *   bun scripts/rehash_and_deduplicate.ts --confirm           # Execute rehashing and deduplication
 *   bun scripts/rehash_and_deduplicate.ts --data-dir /mnt/disk1/.mybooru --confirm
 */

import { parseArgs } from "node:util";
import { stat, unlink, rename, mkdir, readdir, rmdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    confirm: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "data-dir": { type: "string" },
    "no-merge-tags": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
  allowPositionals: false,
});

if (values.help) {
  console.log(`
MyBooru Media Rehashing & Deduplication Tool
===========================================
Re-calculates SHA-256 hashes for all media files on disk.
When duplicates are found, keeps the NEWEST post and deletes older duplicates.

Options:
  --confirm            Execute database updates, file moves, and duplicate deletions
  --dry-run            Preview changes without modifying database or filesystem (default)
  --data-dir <path>    Override storage directory (default: DATA_DIR env or ./data)
  --no-merge-tags      Do not copy tags from deleted duplicate posts to the kept post
  -h, --help           Show this help message

Usage:
  # 1. Preview changes (Dry Run):
  bun scripts/rehash_and_deduplicate.ts

  # 2. Execute changes:
  bun scripts/rehash_and_deduplicate.ts --confirm
`);
  process.exit(0);
}

// 1. Resolve DATA_DIR override before importing DB / paths
if (values["data-dir"]) {
  process.env.DATA_DIR = values["data-dir"];
}

const { db, initDb } = await import("../src/server/db");
const { MediaService } = await import("../src/server/services/MediaService");
const { PATHS } = await import("../src/server/util/paths");
const { TagModel } = await import("../src/server/models/Tag");

await initDb();

const isConfirm = values.confirm && !values["dry-run"];
const mergeTags = !values["no-merge-tags"];

interface PostRecord {
  id: number;
  hash: string;
  extension: string;
  size_bytes: number;
  rating: string;
  created_at: string;
}

interface ScannedPost {
  id: number;
  oldHash: string;
  newHash: string;
  extension: string;
  oldSize: number;
  newSize: number;
  createdAt: string;
  hashChanged: boolean;
}

/**
 * Calculates SHA-256 hash by streaming file bytes (OOM safe)
 */
async function computeSha256(filePath: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  const file = Bun.file(filePath);
  const reader = file.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    hasher.update(value);
  }
  return hasher.digest("hex");
}

/**
 * Safely removes directory if it is empty, plus parent if empty
 */
async function cleanupEmptyDirs(dir: string) {
  try {
    const files = await readdir(dir);
    if (files.length === 0) {
      await rmdir(dir);
      const parent = dirname(dir);
      const parentFiles = await readdir(parent);
      if (parentFiles.length === 0) {
        await rmdir(parent);
      }
    }
  } catch {}
}

async function run() {
  console.log("=== MyBooru Media Rehashing & Deduplication ===");
  console.log(`Database:  ${PATHS.DB}`);
  console.log(`Data Dir:  ${PATHS.DATA}`);
  console.log(`Mode:      ${isConfirm ? "EXECUTE (Permanent changes will be applied!)" : "DRY-RUN (Preview only, no changes)"}`);
  console.log(`Tag Merge: ${mergeTags ? "ENABLED (Tags from deleted duplicates will be merged into kept post)" : "DISABLED"}`);
  console.log("--------------------------------------------------\n");

  // Fetch all posts ordered strictly from NEWEST to OLDEST
  const posts = db.query(`
    SELECT id, hash, extension, size_bytes, rating, created_at 
    FROM posts 
    ORDER BY created_at DESC, id DESC
  `).all() as PostRecord[];

  console.log(`Found ${posts.length} posts in database. Scanning files and computing SHA-256...\n`);

  if (posts.length === 0) {
    console.log("No posts found in database. Exiting.");
    return;
  }

  const scannedPosts: ScannedPost[] = [];
  const missingPosts: PostRecord[] = [];
  let processedCount = 0;

  for (const post of posts) {
    processedCount++;
    if (processedCount % 50 === 0 || processedCount === posts.length) {
      process.stdout.write(`\rHashing files: ${processedCount}/${posts.length}...`);
    }

    const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);

    try {
      const s = await stat(originalPath);
      if (s.size === 0) {
        missingPosts.push(post);
        continue;
      }

      const realHash = await computeSha256(originalPath);
      scannedPosts.push({
        id: post.id,
        oldHash: post.hash,
        newHash: realHash,
        extension: post.extension,
        oldSize: post.size_bytes,
        newSize: s.size,
        createdAt: post.created_at,
        hashChanged: realHash !== post.hash,
      });
    } catch {
      missingPosts.push(post);
    }
  }

  console.log("\n\n--- Scan Results ---");
  console.log(`Total DB Posts:          ${posts.length}`);
  console.log(`Successfully Scanned:    ${scannedPosts.length}`);
  console.log(`Missing/Zero-Byte Files: ${missingPosts.length}`);

  if (missingPosts.length > 0) {
    console.warn(`[WARNING] ${missingPosts.length} post(s) had missing or 0-byte original files and were skipped:`);
    for (const m of missingPosts.slice(0, 10)) {
      console.warn(`  - Post #${m.id} (hash: ${m.hash})`);
    }
    if (missingPosts.length > 10) console.warn(`  ...and ${missingPosts.length - 10} more.`);
  }

  // Group posts by new calculated hash
  // Since scannedPosts preserves order (NEWEST to OLDEST),
  // group[0] is the NEWEST post (kept), and group.slice(1) are older duplicates (deleted).
  const groupsByHash = new Map<string, ScannedPost[]>();
  for (const item of scannedPosts) {
    const list = groupsByHash.get(item.newHash) || [];
    list.push(item);
    groupsByHash.set(item.newHash, list);
  }

  let totalDuplicateGroups = 0;
  let totalDuplicatesToDelete = 0;
  let totalHashesChanged = 0;

  const duplicateGroups: { winner: ScannedPost; losers: ScannedPost[] }[] = [];
  const winnersToUpdate: ScannedPost[] = [];

  for (const [newHash, list] of groupsByHash) {
    const winner = list[0];
    if (list.length > 1) {
      totalDuplicateGroups++;
      const losers = list.slice(1);
      totalDuplicatesToDelete += losers.length;
      duplicateGroups.push({ winner, losers });
    }

    if (winner.hashChanged) {
      totalHashesChanged++;
      winnersToUpdate.push(winner);
    }
  }

  console.log("\n--- Deduplication & Hash Analysis ---");
  console.log(`Unique Media Files:      ${groupsByHash.size}`);
  console.log(`Duplicate Groups:        ${totalDuplicateGroups}`);
  console.log(`Older Posts to Delete:   ${totalDuplicatesToDelete}`);
  console.log(`Posts with Changed Hash: ${totalHashesChanged}`);

  // Display sample duplicate groups
  if (duplicateGroups.length > 0) {
    console.log("\nDuplicate Groups (Newest Kept -> Older Deleted):");
    for (const { winner, losers } of duplicateGroups.slice(0, 10)) {
      console.log(`  [Keep # ${winner.id}] created ${winner.createdAt} | hash: ${winner.newHash.slice(0, 16)}...`);
      for (const loser of losers) {
        console.log(`    └─ [Delete # ${loser.id}] created ${loser.createdAt} (old hash: ${loser.oldHash.slice(0, 16)}...)`);
      }
    }
    if (duplicateGroups.length > 10) {
      console.log(`  ...and ${duplicateGroups.length - 10} more duplicate groups.`);
    }
  }

  if (!isConfirm) {
    console.log("\n========================================================");
    console.log("[DRY-RUN COMPLETE] No changes were made to DB or disk.");
    console.log("To apply these changes, re-run with: --confirm");
    console.log("========================================================");
    return;
  }

  // --- EXECUTION PHASE ---
  console.log("\n>>> APPLYING CHANGES <<<");

  // Step 1: Delete older duplicate posts (losers)
  console.log(`\n1. Deleting ${totalDuplicatesToDelete} older duplicate post(s)...`);
  let deletedCount = 0;

  for (const { winner, losers } of duplicateGroups) {
    for (const loser of losers) {
      // Merge tags if enabled
      if (mergeTags) {
        const loserTags = db.query("SELECT tag_id FROM post_tags WHERE post_id = ?").all(loser.id) as { tag_id: number }[];
        for (const t of loserTags) {
          const linked = TagModel.linkToPost(winner.id, t.tag_id);
          if (!linked) {
            // Already present on winner, decrement count for loser copy
            TagModel.decrementCount(t.tag_id);
          }
        }
      } else {
        const loserTags = db.query("SELECT tag_id FROM post_tags WHERE post_id = ?").all(loser.id) as { tag_id: number }[];
        for (const t of loserTags) {
          TagModel.decrementCount(t.tag_id);
        }
      }

      // Delete from post_tags and posts
      db.prepare("DELETE FROM post_tags WHERE post_id = ?").run(loser.id);
      db.prepare("DELETE FROM posts WHERE id = ?").run(loser.id);

      // Clean up loser's physical files
      // CAUTION: Do NOT delete file if loser's old hash happens to match winner's new hash!
      if (loser.oldHash !== winner.newHash) {
        const loserOrig = MediaService.getShardedPath("original", loser.oldHash, loser.extension);
        const loserThumb = MediaService.getShardedPath("thumbs", loser.oldHash, ".webp");

        await unlink(loserOrig).catch(() => {});
        await unlink(loserThumb).catch(() => {});
        await cleanupEmptyDirs(dirname(loserOrig));
        await cleanupEmptyDirs(dirname(loserThumb));
      }

      deletedCount++;
    }
  }
  console.log(`   Deleted ${deletedCount} duplicate post(s) and associated files.`);

  // Step 2: Relocate physical files for posts whose hash changed
  console.log(`\n2. Moving physical files for ${winnersToUpdate.length} post(s) with changed hashes...`);
  let movedFiles = 0;

  for (const item of winnersToUpdate) {
    const srcOrig = MediaService.getShardedPath("original", item.oldHash, item.extension);
    const dstOrig = MediaService.getShardedPath("original", item.newHash, item.extension);
    const srcThumb = MediaService.getShardedPath("thumbs", item.oldHash, ".webp");
    const dstThumb = MediaService.getShardedPath("thumbs", item.newHash, ".webp");

    if (srcOrig !== dstOrig) {
      await mkdir(dirname(dstOrig), { recursive: true });
      const dstExists = await stat(dstOrig).catch(() => null);
      if (!dstExists) {
        await rename(srcOrig, dstOrig).catch(async () => {
          // Fallback if cross-device or permission error
          await Bun.write(dstOrig, Bun.file(srcOrig));
          await unlink(srcOrig).catch(() => {});
        });
      } else {
        // Target file already exists with identical content
        await unlink(srcOrig).catch(() => {});
      }
      await cleanupEmptyDirs(dirname(srcOrig));
    }

    if (srcThumb !== dstThumb) {
      await mkdir(dirname(dstThumb), { recursive: true });
      const dstThumbExists = await stat(dstThumb).catch(() => null);
      if (!dstThumbExists) {
        const srcThumbExists = await stat(srcThumb).catch(() => null);
        if (srcThumbExists) {
          await rename(srcThumb, dstThumb).catch(async () => {
            await Bun.write(dstThumb, Bun.file(srcThumb));
            await unlink(srcThumb).catch(() => {});
          });
        } else {
          // Source thumb was missing, regenerate from destination original
          await MediaService.generateThumbnail(dstOrig, dstThumb).catch(() => {});
        }
      } else {
        await unlink(srcThumb).catch(() => {});
      }
      await cleanupEmptyDirs(dirname(srcThumb));
    }

    movedFiles++;
    if (movedFiles % 50 === 0 || movedFiles === winnersToUpdate.length) {
      process.stdout.write(`\r   Relocated files: ${movedFiles}/${winnersToUpdate.length}`);
    }
  }

  // Step 3: Update database records atomically in two phases
  // Phase 3a assigns temporary placeholder hashes to eliminate unique constraint collision
  // Phase 3b assigns final true SHA-256 hashes and accurate sizes
  console.log(`\n\n3. Updating ${winnersToUpdate.length} database record(s)...`);

  db.transaction(() => {
    // Phase 3a: Temp placeholders
    for (const item of winnersToUpdate) {
      db.prepare("UPDATE posts SET hash = ? WHERE id = ?").run(`__tmp_rehash_${item.id}`, item.id);
    }
    // Phase 3b: Final true hashes
    for (const item of winnersToUpdate) {
      db.prepare("UPDATE posts SET hash = ?, size_bytes = ? WHERE id = ?").run(
        item.newHash,
        item.newSize,
        item.id
      );
    }
  })();

  console.log(`   Successfully updated ${winnersToUpdate.length} post record(s) in database.`);

  console.log("\n========================================================");
  console.log("REHASHING & DEDUPLICATION COMPLETE!");
  console.log(`- Duplicates Deleted: ${deletedCount}`);
  console.log(`- Hashes/Files Fixed: ${winnersToUpdate.length}`);
  console.log(`- Final Post Count:   ${posts.length - deletedCount}`);
  console.log("========================================================\n");
}

run().catch((e) => {
  console.error("Fatal error during rehashing:", e);
  process.exit(1);
});
