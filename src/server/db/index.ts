import { Database } from "bun:sqlite";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { PATHS } from "../util/paths";
import { runMigrations } from "./util/migrate";

// Ensure the data directory exists before opening the database
mkdirSync(PATHS.DATA, { recursive: true });

export const db = new Database(PATHS.DB);

// Secure database file permissions (owner read/write only)
if (existsSync(PATHS.DB)) {
  try {
    chmodSync(PATHS.DB, 0o600);
  } catch (e) {
    // Non-fatal if we can't chmod (e.g. on some filesystems)
  }
}

db.run("PRAGMA foreign_keys = ON;");
db.run("PRAGMA journal_mode = WAL;");

export async function initDb() {
  await runMigrations(db);
}

export * from "./schema";
