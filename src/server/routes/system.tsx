import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { Offline } from "../views/Offline";
import type { AppEnv } from "../types";

export const systemRouter = new Hono<AppEnv>();

systemRouter.get("/favicon.ico", (c) => c.body(null, 204));
systemRouter.get("/manifest.json", serveStatic({ path: "./public/manifest.json" }));
systemRouter.get("/sw.js", serveStatic({ path: "./public/sw.js" }));
systemRouter.get("/offline", (c) => c.render(<Offline />, { title: "Offline" }));
