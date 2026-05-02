import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

async function setup() {
  const DATA_DIR = process.env.DATA_DIR || "./data-test";
  const ASSETS_DIR = "./tests/assets";
  const AUTH_DIR = "./playwright/.auth";
  
  console.log(`E2E Setup: Using DATA_DIR=${DATA_DIR}`);

  // 1. Clean and setup directories
  if (existsSync(DATA_DIR)) {
    rmSync(DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Clear auth state to ensure fresh login if needed
  if (existsSync(AUTH_DIR)) {
    rmSync(AUTH_DIR, { recursive: true, force: true });
  }
  mkdirSync(AUTH_DIR, { recursive: true });

  // 2. Generate 10 unique images if they don't exist or just overwrite them
  for (let i = 1; i <= 10; i++) {
    const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    const filename = join(ASSETS_DIR, `test-image-${i}.png`);
    
    spawnSync("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=${color}:s=100x100`,
      "-frames:v", "1",
      "-update", "1",
      filename
    ]);
  }
  console.log("E2E Setup: Generated unique test images.");

  // 3. Setup Database
  const dbPath = join(DATA_DIR, "db.sqlite");
  const db = new Database(dbPath);

  // Run Migrations
  const migrationsDir = "./src/server/db/migrations";
  const migrationFiles = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const file of migrationFiles) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    db.transaction(() => {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        db.run(stmt);
      }
      db.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
    })();
    console.log(`E2E Setup: Applied migration ${file}`);
  }

  // 4. Create Test User
  const username = "testuser";
  const password = "testpassword123";
  const passwordHash = await Bun.password.hash(password);
  
  db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, passwordHash]);
  console.log(`E2E Setup: Created test user '${username}'`);

  db.close();
}

setup().catch(console.error);
