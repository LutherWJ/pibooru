import { db } from "../db";
import type { Post, CreatePost, Tag } from "../db/schema";
import { TagModel } from "./Tag";
import type { SearchQuery } from "../util/SearchParser";
import { unlink } from "node:fs/promises";
import { MediaService } from "../services/MediaService";
import { logger } from "../util/logger";

/**
 * PostModel
 * Encapsulates database logic for media posts.
 */
export class PostModel {
  /**
   * Internal helper to build WHERE conditions and params from a SearchQuery.
   */
  private static buildConditions(query: SearchQuery): { conditions: string[], params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.rating) {
      conditions.push("rating = ?");
      params.push(query.rating);
    }

    if (query.type) {
      if (query.type === "video") {
        conditions.push("mime_type LIKE 'video/%'");
      } else if (query.type === "image") {
        conditions.push("mime_type LIKE 'image/%'");
      }
    }

    for (const tag of query.tags) {
      const exists = tag.negated ? "NOT EXISTS" : "EXISTS";
      
      // Resolve alias if it exists
      let tagName = tag.name;
      let tagNamespace = tag.namespace;
      
      const aliasedTag = TagModel.resolveAlias(tag.name);
      if (aliasedTag) {
        tagName = aliasedTag.name;
        tagNamespace = aliasedTag.namespace;
      }

      conditions.push(`${exists} (
        SELECT 1 FROM post_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE pt.post_id = posts.id 
        AND t.name = ? 
        AND t.namespace = ?
      )`);
      params.push(tagName, tagNamespace);
    }

    return { conditions, params };
  }

  /**
   * Searches for posts based on a SearchQuery object.
   */
  static search(query: SearchQuery, limit: number = 50, offset: number = 0): Post[] {
    const { conditions, params } = this.buildConditions(query);

    // Basic order handling
    let orderByField = "id";
    let isAscending = false;

    switch (query.order) {
        case "id_desc": orderByField = "id"; isAscending = false; break;
        case "id_asc": orderByField = "id"; isAscending = true; break;
        case "oldest": orderByField = "created_at"; isAscending = true; break;
        case "newest": default: orderByField = "created_at"; isAscending = false; break;
    }

    // Cursor pagination logic
    let effectiveAscending = isAscending;
    let reverseResults = false;

    if (query.before_id) {
      // In ID DESC (default), "before" in the list means older posts (lower ID)
      // In ID ASC, "before" in the list means older posts (lower ID)
      // Wait, "before" in the list ALWAYS means "closer to the start of the results".
      // If DESC (Newest First), before means HIGHER ID.
      // If ASC (Oldest First), before means LOWER ID.
      
      // Actually, Danbooru uses 'b' for 'before' (older) and 'a' for 'after' (newer).
      // Let's stick to the conventional Booru meaning:
      // before_id (b...) -> items older than this (Next page)
      // after_id (a...) -> items newer than this (Previous page)
      
      conditions.push("id < ?");
      params.push(query.before_id);
      if (isAscending) {
        effectiveAscending = false;
        reverseResults = true;
      }
    }
    if (query.after_id) {
      conditions.push("id > ?");
      params.push(query.after_id);
      if (!isAscending) {
        effectiveAscending = true;
        reverseResults = true;
      }
    }

    const direction = effectiveAscending ? "ASC" : "DESC";
    const orderBy = `ORDER BY ${orderByField} ${direction}, id ${direction}`;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitVal = query.limit || limit;
    
    const sql = `
      SELECT * FROM posts 
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    let results = db.query(sql).all(...params, limitVal, offset) as Post[];

    if (reverseResults) {
      results.reverse();
    }

    return results;
  }

  /**
   * Checks if there are any posts newer than the given cursor.
   */
  static hasNewer(query: SearchQuery, cursorId: number): boolean {
    const { conditions, params } = this.buildConditions(query);
    conditions.push("id > ?");
    params.push(cursorId);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT EXISTS(SELECT 1 FROM posts ${whereClause}) as result`;
    const row = db.query(sql).get(...params) as { result: number };
    return row.result === 1;
  }

  /**
   * Checks if there are any posts older than the given cursor.
   */
  static hasOlder(query: SearchQuery, cursorId: number): boolean {
    const { conditions, params } = this.buildConditions(query);
    conditions.push("id < ?");
    params.push(cursorId);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT EXISTS(SELECT 1 FROM posts ${whereClause}) as result`;
    const row = db.query(sql).get(...params) as { result: number };
    return row.result === 1;
  }

  /**
   * Counts total posts matching a SearchQuery.
   */
  static count(query: SearchQuery): number {
    const { conditions, params } = this.buildConditions(query);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT COUNT(*) as count FROM posts ${whereClause}`;
    
    const result = db.query(sql).get(...params) as { count: number };
    return result.count;
  }

  /**
   * Resolves aliases and expands implications for a set of raw tags.
   */
  private static resolveAndExpandTags(rawTags: string): number[] {
    const tagList = Array.from(new Set(rawTags.split(/\s+/).filter(t => t.length > 0)));
    const tagIds = new Set<number>();

    for (const tagRaw of tagList) {
      const { name, namespace } = TagModel.parseRaw(tagRaw);
      
      // Resolve alias
      let targetName = name;
      let targetNamespace = namespace;
      const aliasedTag = TagModel.resolveAlias(name);
      if (aliasedTag) {
        targetName = aliasedTag.name;
        targetNamespace = aliasedTag.namespace;
      }

      const tagId = TagModel.getOrCreate(targetName, targetNamespace);
      tagIds.add(tagId);
    }

    // Expand implications
    const expandedIds = TagModel.getAllImpliedTagIds(Array.from(tagIds));
    return expandedIds;
  }

  /**
   * Creates a new post and associates it with the provided tags.
   */
  static create(data: CreatePost, rawTags: string): number {
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO posts (
          hash, extension, mime_type, size_bytes, 
          width, height, duration, rating, source, parent_id, has_children, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.hash, data.extension, data.mime_type, data.size_bytes,
        data.width, data.height, data.duration, data.rating, data.source,
        data.parent_id, data.has_children ? 1 : 0, data.user_id || null
      );

      const postId = result.lastInsertRowid as number;

      // Process Tags
      const expandedTagIds = this.resolveAndExpandTags(rawTags);
      for (const tagId of expandedTagIds) {
        if (TagModel.linkToPost(postId, tagId)) {
          TagModel.incrementCount(tagId);
        }
      }

      return postId;
    })();
  }

  /**
   * Updates tags for a post, correctly managing post_count.
   */
  static updateTags(postId: number, rawTags: string): void {
    db.transaction(() => {
      const currentTags = this.getTags(postId);
      const expandedTagIds = this.resolveAndExpandTags(rawTags);
      
      const currentTagIds = new Set(currentTags.map(t => t.id));
      const newTagIds = new Set(expandedTagIds);

      // Tags to remove
      for (const tagId of currentTagIds) {
        if (!newTagIds.has(tagId)) {
          db.prepare("DELETE FROM post_tags WHERE post_id = ? AND tag_id = ?").run(postId, tagId);
          TagModel.decrementCount(tagId);
        }
      }

      // Tags to add
      for (const tagId of newTagIds) {
        if (!currentTagIds.has(tagId)) {
          if (TagModel.linkToPost(postId, tagId)) {
            TagModel.incrementCount(tagId);
          }
        }
      }
    })();
  }

  /**
   * Deletes a post, its associations, and physical files.
   */
  static async delete(postId: number): Promise<void> {
    const post = this.getById(postId);
    if (!post) return;

    const tags = this.getTags(postId);

    db.transaction(() => {
      // Decrement tag counts
      for (const tag of tags) {
        TagModel.decrementCount(tag.id);
      }

      // Delete associations
      db.prepare("DELETE FROM post_tags WHERE post_id = ?").run(postId);

      // Delete post
      db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
    })();

    // Delete physical files
    const originalPath = MediaService.getShardedPath("original", post.hash, post.extension);
    const thumbPath = MediaService.getShardedPath("thumbs", post.hash, ".webp");

    try {
      await unlink(originalPath);
      await unlink(thumbPath);
    } catch (e) {
      logger.error("DB", `Failed to delete files for post ${postId}`, { error: e });
    }
  }

  /**
   * Retrieves the most recent posts.
   * @param limit Maximum number of posts to return.
   * @param offset Number of posts to skip for pagination.
   */
  static getLatest(limit: number = 50, offset: number = 0): Post[] {
    return db.query(`
      SELECT * FROM posts 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset) as Post[];
  }
/**
 * Calculates the most frequent tags for posts matching a SearchQuery.
 */
static getRelatedTags(query: SearchQuery, limit: number = 25): (Tag & { count: number })[] {
  const { conditions, params } = this.buildConditions(query);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // We use a subquery to find matching post IDs first for performance
  const sql = `
    SELECT t.*, COUNT(*) as count
    FROM tags t
    JOIN post_tags pt ON t.id = pt.tag_id
    WHERE pt.post_id IN (
      SELECT id FROM posts ${whereClause}
    )
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC
    LIMIT ?
  `;

  return db.query(sql).all(...params, limit) as (Tag & { count: number })[];
}

/**
 * Retrieves a single post by its ID.
 */static getById(id: number): Post | undefined {
  return db.query("SELECT * FROM posts WHERE id = ?").get(id) as Post | undefined;
}

/**
 * Retrieves tags for a specific post.
 */
static getTags(postId: number): any[] {
  return db.query(`
    SELECT t.* FROM tags t
    JOIN post_tags pt ON t.id = pt.tag_id
    WHERE pt.post_id = ?
    ORDER BY t.namespace ASC, t.name ASC
  `).all(postId);
}

  /**
   * Checks if a post exists by its hash.
   */
  static getByHash(hash: string): Post | undefined {
    return db.query("SELECT * FROM posts WHERE hash = ?").get(hash) as Post | undefined;
  }
}
