import { Hono } from "hono";
import { MediaController } from "../controllers/media.controller";
import type { AppEnv } from "../types";

export const mediaRouter = new Hono<AppEnv>();

mediaRouter.get("/data/*", MediaController.serveMedia);
