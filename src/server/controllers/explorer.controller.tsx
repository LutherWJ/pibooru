import type { Context } from "hono";
import { DirectoryModel } from "../models/Directory";
import { Explorer, ExplorerContent, ExplorerItemsChunk } from "../views/Explorer";
import type { AppEnv } from "../types";

export class ExplorerController {
  static async showExplorer(c: Context<AppEnv>) {
    const dirParam = c.req.query("dir");
    const viewParam = (c.req.query("view") as "grid" | "list") || "grid";
    const sortParam = (c.req.query("sort") as "name" | "date" | "size") || "name";
    const highlightParam = c.req.query("highlight");

    let dirId = dirParam ? parseInt(dirParam, 10) : 1;
    if (isNaN(dirId) || dirId < 1) dirId = 1;

    let dir = DirectoryModel.getById(dirId);
    if (!dir) {
      dir = DirectoryModel.getRoot();
      dirId = dir.id;
    }

    const breadcrumbs = DirectoryModel.getBreadcrumbs(dirId);
    const subdirectories = DirectoryModel.getSubdirectories(dirId);
    const limit = 100;
    const items = DirectoryModel.getItems(dirId, sortParam, limit, 0);
    const totalCount = DirectoryModel.getTotalItemCount(dirId);
    const hasMore = items.length < totalCount;
    const nextOffset = items.length;
    const highlightPostId = highlightParam ? parseInt(highlightParam, 10) : undefined;

    const isHtmx = c.req.header("hx-request") === "true";
    const isBoosted = c.req.header("hx-boosted") === "true";

    // HTMX partial swap targeting explorer-content
    if (isHtmx && !isBoosted) {
      return c.html(
        <ExplorerContent
          currentDir={dir}
          breadcrumbs={breadcrumbs}
          subdirectories={subdirectories}
          items={items}
          viewMode={viewParam}
          sortBy={sortParam}
          highlightPostId={highlightPostId}
          hasMore={hasMore}
          nextOffset={nextOffset}
        />
      );
    }

    // Full page render
    return c.render(
      <Explorer
        currentDir={dir}
        breadcrumbs={breadcrumbs}
        subdirectories={subdirectories}
        items={items}
        viewMode={viewParam}
        sortBy={sortParam}
        highlightPostId={highlightPostId}
        hasMore={hasMore}
        nextOffset={nextOffset}
      />,
      { title: `Explorer - ${dir.name}` }
    );
  }

  static async getItemsChunk(c: Context<AppEnv>) {
    const dirParam = c.req.query("dir");
    const viewParam = (c.req.query("view") as "grid" | "list") || "grid";
    const sortParam = (c.req.query("sort") as "name" | "date" | "size") || "name";
    const offsetParam = parseInt(c.req.query("offset") || "0", 10);
    const limit = 100;

    let dirId = dirParam ? parseInt(dirParam, 10) : 1;
    if (isNaN(dirId) || dirId < 1) dirId = 1;

    const items = DirectoryModel.getItems(dirId, sortParam, limit, offsetParam);
    const totalCount = DirectoryModel.getTotalItemCount(dirId);
    const nextOffset = offsetParam + items.length;
    const hasMore = nextOffset < totalCount;

    return c.html(
      <ExplorerItemsChunk
        dirId={dirId}
        items={items}
        viewMode={viewParam}
        sortBy={sortParam}
        hasMore={hasMore}
        nextOffset={nextOffset}
      />
    );
  }

  static async createFolder(c: Context<AppEnv>) {
    const body = await c.req.parseBody();
    const parentId = parseInt(body.parent_id as string, 10) || 1;
    const name = (body.name as string) || "";

    try {
      const created = DirectoryModel.createDirectory(parentId, name);
      return c.json({ success: true, folder: created });
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async renameFolder(c: Context<AppEnv>) {
    const id = parseInt(c.req.param("id") || "0", 10);
    const body = await c.req.parseBody();
    const name = (body.name as string) || "";

    try {
      const updated = DirectoryModel.renameDirectory(id, name);
      return c.json({ success: true, folder: updated });
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async deleteFolder(c: Context<AppEnv>) {
    const id = parseInt(c.req.param("id") || "0", 10);
    try {
      DirectoryModel.deleteDirectory(id);
      return c.text("Deleted", 200);
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async renameItem(c: Context<AppEnv>) {
    const id = parseInt(c.req.param("id") || "0", 10);
    const body = await c.req.parseBody();
    const name = (body.name as string) || "";

    try {
      DirectoryModel.renameItem(id, name);
      return c.text("Renamed", 200);
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async removeItem(c: Context<AppEnv>) {
    const id = parseInt(c.req.param("id") || "0", 10);
    try {
      DirectoryModel.removeItem(id);
      return c.text("Removed", 200);
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async pasteItems(c: Context<AppEnv>) {
    try {
      const data = await c.req.json<{
        action: "cut" | "copy";
        itemIds?: number[];
        folderIds?: number[];
        targetDirId: number;
      }>();

      const { action, itemIds = [], folderIds = [], targetDirId } = data;
      if (!targetDirId || (!Array.isArray(itemIds) && !Array.isArray(folderIds))) {
        return c.text("Invalid paste payload", 400);
      }

      if (Array.isArray(itemIds)) {
        for (const id of itemIds) {
          if (action === "copy") {
            DirectoryModel.copyItem(id, targetDirId);
          } else if (action === "cut") {
            DirectoryModel.moveItem(id, targetDirId);
          }
        }
      }

      if (Array.isArray(folderIds) && action === "cut") {
        for (const fId of folderIds) {
          DirectoryModel.moveDirectory(fId, targetDirId);
        }
      }

      return c.json({ success: true });
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async batchDelete(c: Context<AppEnv>) {
    try {
      const data = await c.req.json<{
        itemIds?: number[];
        folderIds?: number[];
      }>();
      const { itemIds = [], folderIds = [] } = data;

      if (Array.isArray(itemIds) && itemIds.length > 0) {
        DirectoryModel.batchRemoveItems(itemIds);
      }
      if (Array.isArray(folderIds) && folderIds.length > 0) {
        DirectoryModel.batchDeleteFolders(folderIds);
      }

      return c.json({ success: true });
    } catch (err: any) {
      return c.text(err.message, 400);
    }
  }

  static async getPostLocations(c: Context<AppEnv>) {
    const postId = parseInt(c.req.param("postId") || "0", 10);
    const locations = DirectoryModel.findLocationsForPost(postId);

    if (c.req.header("accept")?.includes("application/json")) {
      return c.json({ locations });
    }

    if (locations.length === 0) {
      return c.html(
        <div class="location-picker-content">
          <p style="margin-bottom: 10px; font-size: 13px; color: #94a3b8;">This post is in the Root directory:</p>
          <a href={`/explorer?dir=1&highlight=${postId}`} class="button location-btn" style="display:block; text-align:center; padding:10px; background:#2563eb; color:white; border-radius:4px; text-decoration:none; font-weight:bold;">
            📁 Open Root
          </a>
        </div>
      );
    }

    return c.html(
      <div class="location-picker-content">
        <p style="margin-bottom: 12px; font-size: 13px; color: #94a3b8;">
          {locations.length === 1 ? "Found in directory:" : `Found in ${locations.length} directories. Choose one to open:`}
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          {locations.map(loc => (
            <a
              key={loc.directoryId}
              href={`/explorer?dir=${loc.directoryId}&highlight=${postId}`}
              class="button location-btn"
              style="text-align: left; padding: 10px 14px; font-size: 13px; background: #262626; border: 1px solid #444; border-radius: 4px; color: #38bdf8; text-decoration: none; font-weight: bold; display: flex; align-items: center; gap: 8px;"
            >
              <span>📁</span> <span>{loc.path}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }
}
