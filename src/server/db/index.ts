import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { PATHS } from "../util/paths";
import { runMigrations } from "./util/migrate";

// Ensure the data directory exists before opening the database
// recursive: true ensures it doesn't throw if the directory already exists
mkdirSync(PATHS.DATA, { recursive: true });

export const db = new Database(PATHS.DB);

db.run("PRAGMA foreign_keys = ON;");
db.run("PRAGMA journal_mode = WAL;");

export async function initDb() {
  await runMigrations(db);
}

export * from "./schema";
