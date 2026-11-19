import { Hono } from "hono";
import { ExplorerController } from "../controllers/explorer.controller";
import type { AppEnv } from "../types";

export const explorerRouter = new Hono<AppEnv>();

explorerRouter.get("/explorer", ExplorerController.showExplorer);
explorerRouter.post("/explorer/folders", ExplorerController.createFolder);
explorerRouter.post("/explorer/folders/:id/rename", ExplorerController.renameFolder);
explorerRouter.delete("/explorer/folders/:id", ExplorerController.deleteFolder);
explorerRouter.post("/explorer/items/:id/rename", ExplorerController.renameItem);
explorerRouter.delete("/explorer/items/:id", ExplorerController.removeItem);
explorerRouter.post("/explorer/paste", ExplorerController.pasteItems);
explorerRouter.get("/explorer/post-locations/:postId", ExplorerController.getPostLocations);
