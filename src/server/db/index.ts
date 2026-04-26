import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { PATHS } from "../util/paths";
import { runMigrations } from "./util/migrate";

export const db = new Database(PATHS.DB);

db.run("PRAGMA foreign_keys = ON;");
db.run("PRAGMA journal_mode = WAL;");

export async function initDb() {
  try {
    await mkdir(PATHS.DATA, { recursive: true });
  } catch (e) {
  }

  await runMigrations(db);
}

export * from "./schema";
