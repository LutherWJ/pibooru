import { db } from "../db";
import type { Tag, TagNamespace } from "../db/schema";

/**
 * TagModel
 * Encapsulates database logic for media tags.
 */
export class TagModel {
  /**
   * Gets or creates a tag by name and namespace.
   * Does NOT increment post_count.
   */
  static getOrCreate(name: string, namespace: string = "general"): number {
    db.prepare(`
      INSERT OR IGNORE INTO tags (name, namespace, post_count) 
      VALUES (?, ?, 0)
    `).run(name, namespace);

    const tag = db.query("SELECT id FROM tags WHERE name = ? AND namespace = ?").get(name, namespace) as { id: number };
    return tag.id;
  }

  /**
   * Upserts a tag (used in tests).
   */
  static upsert(name: string, namespace: string = "general"): number {
    return this.getOrCreate(name, namespace);
  }

  /**
   * Retrieves paginated tags with optional search.
   */
  static getPaginated(query: string = "", limit: number = 50, offset: number = 0): Tag[] {
    if (query) {
      return db.query(`
        SELECT * FROM tags 
        WHERE name LIKE ? 
        ORDER BY post_count DESC, name ASC 
        LIMIT ? OFFSET ?
      `).all(`%${query.toLowerCase()}%`, limit, offset) as Tag[];
    }
    return db.query(`
      SELECT * FROM tags 
      ORDER BY post_count DESC, name ASC 
      LIMIT ? OFFSET ?
    `).all(limit, offset) as Tag[];
  }

  /**
   * Counts total tags matching a query.
   */
  static countTotal(query: string = ""): number {
    if (query) {
      const result = db.query("SELECT COUNT(*) as count FROM tags WHERE name LIKE ?")
        .get(`%${query.toLowerCase()}%`) as { count: number };
      return result.count;
    }
    const result = db.query("SELECT COUNT(*) as count FROM tags").get() as { count: number };
    return result.count;
  }

  /**
   * Increments post_count for a tag.
   */
  static incrementCount(tagId: number): void {
    db.prepare("UPDATE tags SET post_count = post_count + 1 WHERE id = ?").run(tagId);
  }

  /**
   * Decrements post_count for a tag.
   */
  static decrementCount(tagId: number): void {
    db.prepare("UPDATE tags SET post_count = post_count - 1 WHERE id = ?").run(tagId);
  }

  /**
   * Links a post to a tag in the junction table.
   * Returns true if a new link was created.
   */
  static linkToPost(postId: number, tagId: number): boolean {
    const result = db.prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)").run(postId, tagId);
    return result.changes > 0;
  }

  /**
   * Parses a raw tag string (e.g. "artist:picasso") into name and namespace.
   */
  static parseRaw(raw: string): { name: string; namespace: string } {
    let name = raw.toLowerCase();
    let namespace = "general";

    if (name.includes(":")) {
      const parts = name.split(":");
      namespace = parts[0] || "general";
      name = parts.slice(1).join(":");
    }

    return { name, namespace };
  }

  /**
   * Searches tags by a prefix string.
   * If the prefix contains a namespace (e.g. "artist:pi"), it searches that namespace.
   * Otherwise, it searches across all namespaces, prioritizing exact matches or high post counts.
   */
  static search(prefix: string, limit: number = 10): Tag[] {
    if (!prefix) return [];

    let nameQuery = prefix.toLowerCase();
    let namespace = null;

    // Check if the prefix includes a namespace search
    if (nameQuery.includes(":")) {
      const parts = nameQuery.split(":", 2);
      namespace = parts[0];
      nameQuery = parts[1];
    }

    if (namespace) {
      return db.query(`
        SELECT * FROM tags 
        WHERE namespace = ? AND name LIKE ? 
        ORDER BY post_count DESC, name ASC 
        LIMIT ?
      `).all(namespace, `${nameQuery}%`, limit) as Tag[];
    } else {
      return db.query(`
        SELECT * FROM tags 
        WHERE name LIKE ? 
        ORDER BY post_count DESC, name ASC 
        LIMIT ?
      `).all(`${nameQuery}%`, limit) as Tag[];
    }
  }
}
