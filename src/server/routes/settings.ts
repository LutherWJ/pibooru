import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { SettingsController } from "../controllers/settings.controller";
import { ContentRatingFilterSchema } from "../db/schema";
import type { AppEnv } from "../types";

export const settingsRouter = new Hono<AppEnv>();

settingsRouter.get("/settings", SettingsController.showSettings);
settingsRouter.post("/settings/rotate-api-key", SettingsController.rotateApiKey);
settingsRouter.post(
  "/settings/content-filter",
  zValidator("form", z.object({ default_rating: ContentRatingFilterSchema })),
  SettingsController.updateContentFilter
);
