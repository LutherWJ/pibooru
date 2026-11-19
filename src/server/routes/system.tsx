import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { Offline } from "../views/Offline";
import { Wiki } from "../views/Wiki";
import { ApiDocs } from "../views/ApiDocs";
import type { AppEnv } from "../types";

export const systemRouter = new Hono<AppEnv>();

systemRouter.get("/favicon.ico", (c) => c.body(null, 204));
systemRouter.get("/manifest.json", serveStatic({ path: "./public/manifest.json" }));
systemRouter.get("/sw.js", serveStatic({ path: "./public/sw.js" }));
systemRouter.get("/offline", (c) => c.render(<Offline />, { title: "Offline" }));
systemRouter.get("/wiki/api", (c) => c.render(<ApiDocs />, { title: "REST API & Scripting Guide" }));
systemRouter.get("/wiki_pages/api", (c) => c.render(<ApiDocs />, { title: "REST API & Scripting Guide" }));
systemRouter.get("/help/api", (c) => c.render(<ApiDocs />, { title: "REST API & Scripting Guide" }));
systemRouter.get("/wiki_pages", (c) => c.render(<Wiki />, { title: "Search Syntax & Query Guide" }));
systemRouter.get("/wiki", (c) => c.render(<Wiki />, { title: "Search Syntax & Query Guide" }));
systemRouter.get("/help/search", (c) => c.render(<Wiki />, { title: "Search Syntax & Query Guide" }));
