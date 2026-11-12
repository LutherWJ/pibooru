import { Hono } from "hono";
import { SettingsController } from "../controllers/settings.controller";
import type { AppEnv } from "../types";

export const settingsRouter = new Hono<AppEnv>();

settingsRouter.get("/settings", SettingsController.showSettings);
settingsRouter.post("/settings/rotate-api-key", SettingsController.rotateApiKey);
