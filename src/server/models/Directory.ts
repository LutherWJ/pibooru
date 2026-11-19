import { db } from "../db";
import type { Directory, DirectoryItem, DirectoryItemWithPost } from "../db/schema";

export interface DirectoryWithStats extends Directory {
  item_count: number;
  subdirectory_count: number;
}

export class DirectoryModel {
  /**
   * Helper to ensure unique filename in a target folder by appending (1), (2), etc.
   */
  private static resolveUniqueName(directoryId: number, baseName: string, excludeItemId?: number): string {
    const query = excludeItemId 
      ? "SELECT custom_name FROM directory_items WHERE directory_id = ? AND id != ?"
      : "SELECT custom_name FROM directory_items WHERE directory_id = ?";
    const params = excludeItemId ? [directoryId, excludeItemId] : [directoryId];
    const existing = new Set((db.query(query).all(...params) as any[]).map(r => r.custom_name).filter(Boolean));

    if (!existing.has(baseName)) {
      return baseName;
    }

    const lastDot = baseName.lastIndexOf('.');
    let namePart = baseName;
    let extPart = '';
    if (lastDot > 0) {
      namePart = baseName.substring(0, lastDot);
      extPart = baseName.substring(lastDot);
    }
    namePart = namePart.replace(/\s*\(\d+\)$/, '');

    let counter = 1;
    while (true) {
      const candidate = `${namePart} (${counter})${extPart}`;
      if (!existing.has(candidate)) {
        return candidate;
      }
      counter++;
    }
  }

  /**
   * Retrieves the canonical root directory (id = 1).
   */
  static getRoot(): Directory {
    let root = db.query("SELECT * FROM directories WHERE id = 1").get() as Directory | undefined;
    if (!root) {
      db.prepare("INSERT OR IGNORE INTO directories (id, parent_id, name) VALUES (1, NULL, 'Root')").run();
      root = db.query("SELECT * FROM directories WHERE id = 1").get() as Directory;
    }
    return root;
  }

  /**
   * Retrieves a directory by its ID.
   */
  static getById(id: number): Directory | undefined {
    const row = db.query("SELECT * FROM directories WHERE id = ?").get(id) as Directory | null;
    return row || undefined;
  }

  /**
   * Walks the parent chain from id up to root, returning array of breadcrumb objects.
   */
  static getBreadcrumbs(id: number): Array<{ id: number; name: string }> {
    const breadcrumbs: Array<{ id: number; name: string }> = [];
    let currentId: number | null = id;

    while (currentId !== null) {
      const dir = db.query("SELECT id, parent_id, name FROM directories WHERE id = ?").get(currentId) as Directory | undefined;
      if (!dir) break;
      breadcrumbs.unshift({ id: dir.id, name: dir.name });
      currentId = dir.parent_id;
    }

    return breadcrumbs;
  }

  /**
   * Returns human-readable path string (e.g. "Root / Wallpapers / Anime").
   */
  static getFullPath(id: number): string {
    const crumbs = this.getBreadcrumbs(id);
    return crumbs.map(c => c.name).join(" / ");
  }

  /**
   * Retrieves all direct subdirectories with item and subfolder counts.
   */
  static getSubdirectories(parentId: number): DirectoryWithStats[] {
    const rows = db.query(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM directory_items di WHERE di.directory_id = d.id) AS item_count,
        (SELECT COUNT(*) FROM directories sub WHERE sub.parent_id = d.id) AS subdirectory_count
      FROM directories d
      WHERE d.parent_id = ?
      ORDER BY d.name COLLATE NOCASE ASC
    `).all(parentId) as any[];

    return rows.map(r => ({
      ...r,
      item_count: r.item_count || 0,
      subdirectory_count: r.subdirectory_count || 0
    }));
  }

  /**
   * Retrieves all file items inside a directory, joined with posts table.
   */
  static getItems(directoryId: number, sortBy: "name" | "date" | "size" = "name"): DirectoryItemWithPost[] {
    let orderClause = "COALESCE(di.custom_name, p.hash || p.extension) COLLATE NOCASE ASC";
    if (sortBy === "date") {
      orderClause = "p.created_at DESC";
    } else if (sortBy === "size") {
      orderClause = "p.size_bytes DESC";
    }

    return db.query(`
      SELECT 
        di.id,
        di.directory_id,
        di.post_id,
        COALESCE(di.custom_name, p.hash || p.extension) AS custom_name,
        di.created_at,
        p.hash,
        p.extension,
        p.size_bytes,
        p.mime_type,
        p.rating,
        p.width,
        p.height,
        p.created_at AS post_created_at
      FROM directory_items di
      JOIN posts p ON di.post_id = p.id
      WHERE di.directory_id = ?
      ORDER BY ${orderClause}
    `).all(directoryId) as DirectoryItemWithPost[];
  }

  /**
   * Creates a new child directory.
   */
  static createDirectory(parentId: number, rawName: string): Directory {
    const name = rawName.trim();
    if (!name) throw new Error("Directory name cannot be empty");
    if (name.includes("/") || name.includes("\\")) throw new Error("Directory name cannot contain slashes");

    // Check parent exists
    const parent = this.getById(parentId);
    if (!parent) throw new Error("Parent directory not found");

    // Check duplicate name under same parent
    const existing = db.query("SELECT id FROM directories WHERE parent_id = ? AND name = ? COLLATE NOCASE").get(parentId, name);
    if (existing) {
      throw new Error(`Directory '${name}' already exists in this folder`);
    }

    const result = db.prepare("INSERT INTO directories (parent_id, name) VALUES (?, ?)").run(parentId, name);
    return this.getById(Number(result.lastInsertRowid))!;
  }

  /**
   * Renames a directory (Root cannot be renamed).
   */
  static renameDirectory(id: number, rawName: string): Directory {
    if (id === 1) throw new Error("Root directory cannot be renamed");
    const name = rawName.trim();
    if (!name) throw new Error("Directory name cannot be empty");
    if (name.includes("/") || name.includes("\\")) throw new Error("Directory name cannot contain slashes");

    const current = this.getById(id);
    if (!current) throw new Error("Directory not found");

    const duplicate = db.query("SELECT id FROM directories WHERE parent_id = ? AND name = ? COLLATE NOCASE AND id != ?")
      .get(current.parent_id, name, id);
    if (duplicate) {
      throw new Error(`A folder named '${name}' already exists in this directory`);
    }

    db.prepare("UPDATE directories SET name = ? WHERE id = ?").run(name, id);
    return this.getById(id)!
  }

  /**
   * Deletes a directory and all child items/folders (Root cannot be deleted).
   */
  static deleteDirectory(id: number): void {
    if (id === 1) throw new Error("Root directory cannot be deleted");
    db.prepare("DELETE FROM directories WHERE id = ?").run(id);
  }

  /**
   * Moves a directory into a new parent directory.
   * Prevents moving root, moving into itself, or creating circular directory ancestry.
   */
  static moveDirectory(id: number, targetParentId: number): Directory {
    if (id === 1) throw new Error("Root directory cannot be moved");
    if (id === targetParentId) throw new Error("Cannot move directory into itself");

    const targetParent = this.getById(targetParentId);
    if (!targetParent) throw new Error("Target parent directory not found");

    const current = this.getById(id);
    if (!current) throw new Error("Directory not found");

    // Detect circular ancestry: check if targetParent is a descendant of id
    let ancestorCheck: number | null = targetParentId;
    while (ancestorCheck !== null) {
      if (ancestorCheck === id) {
        throw new Error("Cannot move a directory into its own subfolder");
      }
      const p = db.query("SELECT parent_id FROM directories WHERE id = ?").get(ancestorCheck) as { parent_id: number | null } | undefined;
      ancestorCheck = p ? p.parent_id : null;
    }

    // Check duplicate name under target parent
    const duplicate = db.query("SELECT id FROM directories WHERE parent_id = ? AND name = ? COLLATE NOCASE AND id != ?")
      .get(targetParentId, current.name, id);
    if (duplicate) {
      throw new Error(`A folder named '${current.name}' already exists in the target directory`);
    }

    db.prepare("UPDATE directories SET parent_id = ? WHERE id = ?").run(targetParentId, id);
    return this.getById(id)!;
  }

  /**
   * Batch deletes multiple directories.
   */
  static batchDeleteFolders(folderIds: number[]): void {
    const validIds = folderIds.filter(id => id !== 1);
    if (validIds.length === 0) return;
    const placeholders = validIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM directories WHERE id IN (${placeholders})`).run(...validIds);
  }

  /**
   * Batch unlinks multiple items from directories.
   */
  static batchRemoveItems(itemIds: number[]): void {
    if (itemIds.length === 0) return;
    const placeholders = itemIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM directory_items WHERE id IN (${placeholders})`).run(...itemIds);
  }

  /**
   * Renames an item inside a folder.
   */
  static renameItem(itemId: number, rawName: string): void {
    const name = rawName.trim();
    if (!name) throw new Error("Filename cannot be empty");

    const item = db.query("SELECT * FROM directory_items WHERE id = ?").get(itemId) as DirectoryItem | undefined;
    if (!item) throw new Error("File item not found");

    const finalName = this.resolveUniqueName(item.directory_id, name, itemId);
    db.prepare("UPDATE directory_items SET custom_name = ? WHERE id = ?").run(finalName, itemId);
  }

  /**
   * Unlinks a file item from a directory (does not delete post).
   */
  static removeItem(itemId: number): void {
    db.prepare("DELETE FROM directory_items WHERE id = ?").run(itemId);
  }

  /**
   * Copies an item to target directory with (1) suffixing if necessary.
   */
  static copyItem(itemId: number, targetDirId: number): DirectoryItem {
    const source = db.query(`
      SELECT di.*, p.hash, p.extension 
      FROM directory_items di 
      JOIN posts p ON di.post_id = p.id 
      WHERE di.id = ?
    `).get(itemId) as any;

    if (!source) throw new Error("Source item not found");

    const targetDir = this.getById(targetDirId);
    if (!targetDir) throw new Error("Target directory not found");

    const currentName = source.custom_name || `${source.hash}${source.extension}`;
    const uniqueName = this.resolveUniqueName(targetDirId, currentName);

    // If already in target directory with same post_id, ignore or rename
    const existingSamePost = db.query("SELECT id FROM directory_items WHERE directory_id = ? AND post_id = ?")
      .get(targetDirId, source.post_id) as any;

    if (existingSamePost) {
      // Post is already linked in this directory
      return this.getItemById(existingSamePost.id)!;
    }

    const res = db.prepare(`
      INSERT INTO directory_items (directory_id, post_id, custom_name) 
      VALUES (?, ?, ?)
    `).run(targetDirId, source.post_id, uniqueName);

    return this.getItemById(Number(res.lastInsertRowid))!;
  }

  /**
   * Moves an item to target directory (Cut & Paste).
   */
  static moveItem(itemId: number, targetDirId: number): DirectoryItem {
    const source = db.query(`
      SELECT di.*, p.hash, p.extension 
      FROM directory_items di 
      JOIN posts p ON di.post_id = p.id 
      WHERE di.id = ?
    `).get(itemId) as any;

    if (!source) throw new Error("Source item not found");
    if (source.directory_id === targetDirId) return source;

    const targetDir = this.getById(targetDirId);
    if (!targetDir) throw new Error("Target directory not found");

    // Check if target directory already has this post
    const existingSamePost = db.query("SELECT id FROM directory_items WHERE directory_id = ? AND post_id = ?")
      .get(targetDirId, source.post_id) as any;

    if (existingSamePost) {
      // Remove source duplicate since it's already in target
      this.removeItem(itemId);
      return this.getItemById(existingSamePost.id)!;
    }

    const currentName = source.custom_name || `${source.hash}${source.extension}`;
    const uniqueName = this.resolveUniqueName(targetDirId, currentName, itemId);

    db.prepare(`
      UPDATE directory_items 
      SET directory_id = ?, custom_name = ? 
      WHERE id = ?
    `).run(targetDirId, uniqueName, itemId);

    return this.getItemById(itemId)!;
  }

  /**
   * Retrieves single item by item ID.
   */
  static getItemById(id: number): DirectoryItem | undefined {
    const row = db.query("SELECT * FROM directory_items WHERE id = ?").get(id) as DirectoryItem | null;
    return row || undefined;
  }

  /**
   * Inserts a post into the Root directory by default.
   */
  static addToRoot(postId: number, defaultName?: string): void {
    const root = this.getRoot();
    db.prepare(`
      INSERT OR IGNORE INTO directory_items (directory_id, post_id, custom_name)
      VALUES (?, ?, ?)
    `).run(root.id, postId, defaultName || null);
  }

  /**
   * Finds all directory paths where a given post is placed.
   */
  static findLocationsForPost(postId: number): Array<{ directoryId: number; directoryName: string; path: string }> {
    const items = db.query(`
      SELECT di.directory_id, d.name
      FROM directory_items di
      JOIN directories d ON di.directory_id = d.id
      WHERE di.post_id = ?
    `).all(postId) as any[];

    return items.map(item => ({
      directoryId: item.directory_id,
      directoryName: item.name,
      path: this.getFullPath(item.directory_id)
    }));
  }
}
