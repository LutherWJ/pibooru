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
    if (!name) throw new Error("Tag name cannot be empty");

    db.prepare(`
      INSERT OR IGNORE INTO tags (name, namespace, post_count) 
      VALUES (?, ?, 0)
    `).run(name, namespace);

    const tag = db.query("SELECT id FROM tags WHERE name = ? AND namespace = ?").get(name, namespace) as { id: number } | undefined;
    if (!tag) {
      throw new Error(`Failed to get or create tag ${namespace}:${name}`);
    }
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
   * Internal helper to resolve namespace and name from a string.
   */
  private static resolveNamespace(input: string): { name: string, namespace: string } {
    let name = input;
    let namespace = "general";

    if (input.includes(":") && !input.startsWith(":")) {
      const parts = input.split(":");
      const possibleNamespace = parts[0];
      const validNamespaces = ['artist', 'character', 'copyright', 'meta', 'general'];
      const aliases: Record<string, string> = {
        'art': 'artist',
        'char': 'character',
        'copy': 'copyright',
      };
      
      let namespaceToUse = possibleNamespace || "";
      if (possibleNamespace && aliases[possibleNamespace]) {
        namespaceToUse = aliases[possibleNamespace];
      }

      if (namespaceToUse && validNamespaces.includes(namespaceToUse)) {
        namespace = namespaceToUse;
        name = parts.slice(1).join(":");
      }
    }

    if (name.startsWith(":")) {
      name = name.substring(1);
    }

    return { name: name.trim(), namespace };
  }

  /**
   * Parses a raw tag string (e.g. "artist:picasso") into name and namespace.
   */
  static parseRaw(raw: string): { name: string; namespace: string } {
    let input = raw.trim().toLowerCase();
    if (!input) return { name: "", namespace: "general" };
    return this.resolveNamespace(input);
  }

  /**
   * Searches tags by a prefix string.
   * If the prefix contains a namespace (e.g. "artist:pi"), it searches that namespace.
   * Otherwise, it searches across all namespaces, prioritizing exact matches or high post counts.
   */
  static search(prefix: string, limit: number = 10): Tag[] {
    if (!prefix) return [];

    let input = prefix.toLowerCase().trim();
    const { name: nameQuery, namespace } = this.resolveNamespace(input);

    if (namespace !== "general" || input.includes("general:")) {
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

  /**
   * Gets a tag by name and namespace.
   */
  static getByName(name: string, namespace: string = "general"): Tag | null {
    return db.query("SELECT * FROM tags WHERE name = ? AND namespace = ?").get(name, namespace) as Tag | null;
  }

  /**
   * Gets a tag by ID.
   */
  static getById(id: number): Tag | null {
    return db.query("SELECT * FROM tags WHERE id = ?").get(id) as Tag | null;
  }

  // --- Alias Management ---

  /**
   * Resolves an alias to its target tag.
   */
  static resolveAlias(aliasName: string): Tag | null {
    return db.query(`
      SELECT t.* FROM tags t
      JOIN tag_aliases ta ON t.id = ta.target_tag_id
      WHERE ta.alias_name = ?
    `).get(aliasName.toLowerCase()) as Tag | null;
  }

  /**
   * Adds an alias for a tag.
   */
  static addAlias(targetTagId: number, aliasName: string): void {
    db.prepare(`
      INSERT OR REPLACE INTO tag_aliases (alias_name, target_tag_id)
      VALUES (?, ?)
    `).run(aliasName.toLowerCase(), targetTagId);
  }

  /**
   * Removes an alias.
   */
  static removeAlias(aliasName: string): void {
    db.prepare("DELETE FROM tag_aliases WHERE alias_name = ?").run(aliasName.toLowerCase());
  }

  /**
   * Gets all aliases for a tag.
   */
  static getAliases(tagId: number): string[] {
    const result = db.query("SELECT alias_name FROM tag_aliases WHERE target_tag_id = ?").all(tagId) as { alias_name: string }[];
    return result.map(r => r.alias_name);
  }

  // --- Implication Management ---

  /**
   * Adds an implication: if a post has sourceTagId, it should also have targetTagId.
   */
  static addImplication(sourceTagId: number, targetTagId: number): void {
    if (sourceTagId === targetTagId) return;
    db.prepare(`
      INSERT OR IGNORE INTO tag_implications (source_tag_id, target_tag_id)
      VALUES (?, ?)
    `).run(sourceTagId, targetTagId);
  }

  /**
   * Removes an implication.
   */
  static removeImplication(sourceTagId: number, targetTagId: number): void {
    db.prepare("DELETE FROM tag_implications WHERE source_tag_id = ? AND target_tag_id = ?").run(sourceTagId, targetTagId);
  }

  /**
   * Gets tags implied by the given tag.
   */
  static getImplications(tagId: number): Tag[] {
    return db.query(`
      SELECT t.* FROM tags t
      JOIN tag_implications ti ON t.id = ti.target_tag_id
      WHERE ti.source_tag_id = ?
    `).all(tagId) as Tag[];
  }

  /**
   * Recursively finds all tags implied by a set of tag IDs.
   */
  static getAllImpliedTagIds(tagIds: number[]): number[] {
    const allIds = new Set<number>(tagIds);
    let currentIds = [...tagIds];

    while (currentIds.length > 0) {
      const nextIds: number[] = [];
      for (const id of currentIds) {
        const implied = db.query("SELECT target_tag_id FROM tag_implications WHERE source_tag_id = ?").all(id) as { target_tag_id: number }[];
        for (const row of implied) {
          if (!allIds.has(row.target_tag_id)) {
            allIds.add(row.target_tag_id);
            nextIds.push(row.target_tag_id);
          }
        }
      }
      currentIds = nextIds;
    }

    return Array.from(allIds);
  }
}
