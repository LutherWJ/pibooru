import { Database } from "bun:sqlite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PATHS } from "../../util/paths";

export async function runMigrations(db: Database) {
  console.log("Checking for database migrations...");

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
      console.log(`Executing migration: ${file}`);
      const sql = await readFile(join(PATHS.MIGRATIONS, file), "utf8");
      
      // Execute as a transaction
      db.transaction(() => {
        db.run(sql);
        db.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
      })();
      
      console.log(`Migration ${file} completed successfully.`);
    }
  }

  console.log("Database is up to date.");
}
