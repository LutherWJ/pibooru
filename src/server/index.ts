import { Hono } from "hono";
import { CONFIG } from "./util/config";
import { serveStatic } from "hono/serve-static";
import { PATHS } from "./util/paths";
import { logger } from "hono/logger";

const app = new Hono();
app.use('*', logger());

app.get('/*', serveStatic({root: PATHS.PUBLIC}));

export default {
    port: CONFIG.PORT,
}
