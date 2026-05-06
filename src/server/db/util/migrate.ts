import { Database } from "bun:sqlite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PATHS } from "../../util/paths";
import { logger } from "../../util/logger";

export async function runMigrations(db: Database) {
  logger.info({ domain: "DB" }, "Checking for database migrations...");

  // Disable foreign keys during migration to allow for table recreations
  const fkStatus = db.query("PRAGMA foreign_keys").get() as { foreign_keys: number };
  db.run("PRAGMA foreign_keys = OFF;");

  try {
    // Ensure migrations table exists
    db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationFiles = (await readdir(PATHS.MIGRATIONS))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const executedMigrations = new Set(
      db.query("SELECT name FROM _migrations").all().map((m: any) => m.name)
    );

    for (const file of migrationFiles) {
      if (!executedMigrations.has(file)) {
        logger.info({ domain: "DB", migration: file }, "Executing migration");
        const sql = await readFile(join(PATHS.MIGRATIONS, file), "utf8");
        
        // Execute as a transaction
        db.transaction(() => {
          db.run(sql);
          db.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
        })();
        
        logger.info({ domain: "DB", migration: file }, "Migration completed successfully");
      }
    }
  } finally {
    // Restore foreign key setting
    if (fkStatus.foreign_keys === 1) {
      db.run("PRAGMA foreign_keys = ON;");
    }
  }

  logger.info({ domain: "DB" }, "Database is up to date.");
}
