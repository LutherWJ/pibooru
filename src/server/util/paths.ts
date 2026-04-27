import { join, isAbsolute, dirname } from "node:path";
import { CONFIG } from "./config";

// Resolve ROOT based on the location of this file (src/server/util/paths.ts)
// util -> server -> src -> ROOT
const ROOT = join(import.meta.dir, "..", "..", "..");

// Resolve the data directory (supports absolute paths for external drives)
const DATA_ROOT = isAbsolute(CONFIG.DATA_DIR) 
  ? CONFIG.DATA_DIR 
  : join(ROOT, CONFIG.DATA_DIR);

export const PATHS = {
  ROOT,
  SRC: join(ROOT, "src"),
  PUBLIC: join(ROOT, "public"),
  DATA: DATA_ROOT,
  DB: join(DATA_ROOT, "db.sqlite"),
  MIGRATIONS: join(ROOT, "src", "server", "db", "migrations"),
  CLIENT: join(ROOT, "src", "client"),
  SERVER: join(ROOT, "src", "server"),
  VIEWS: join(ROOT, "src", "server", "views"),
  ROUTES: join(ROOT, "src", "server", "routes"),
  MODELS: join(ROOT, "src", "server", "models"),
  MIDDLEWARE: join(ROOT, "src", "server", "middleware"),
} as const;
