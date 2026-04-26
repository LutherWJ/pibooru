import { join } from "node:path";

const ROOT = process.cwd();

export const PATHS = {
  ROOT,
  SRC: join(ROOT, "src"),
  PUBLIC: join(ROOT, "public"),
  DATA: join(ROOT, "data"),
  DB: join(ROOT, "data", "alfred.sqlite"),
  CLIENT: join(ROOT, "src", "client"),
  SERVER: join(ROOT, "src", "server"),
  VIEWS: join(ROOT, "src", "server", "views"),
  ROUTES: join(ROOT, "src", "server", "routes"),
  MODELS: join(ROOT, "src", "server", "models"),
  MIDDLEWARE: join(ROOT, "src", "server", "middleware"),
} as const;
