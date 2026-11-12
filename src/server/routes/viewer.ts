import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ViewerController } from "../controllers/viewer.controller";
import type { AppEnv } from "../types";

export const viewerRouter = new Hono<AppEnv>();

viewerRouter.get(
    "/viewer",
    zValidator(
        "query",
        z.object({
            tags: z.string().optional().default(""),
            page: z.string().optional().default("1"),
        })
    ),
    ViewerController.showViewer
);
