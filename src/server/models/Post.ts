import { db } from "../db";
import type { Post, CreatePost } from "../db/schema";
import { TagModel } from "./Tag";
import type { SearchQuery } from "../util/SearchParser";
import { unlink } from "node:fs/promises";
import { MediaService } from "../services/MediaService";

/**
 * PostModel
 * Encapsulates database logic for media posts.
 */
export class PostModel {
  /**
   * Searches for posts based on a SearchQuery object.
   */
  static search(query: SearchQuery, limit: number = 50, offset: number = 0): Post[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.rating) {
      conditions.push("rating = ?");
      params.push(query.rating);
    }

    for (const tag of query.tags) {
      const exists = tag.negated ? "NOT EXISTS" : "EXISTS";
      conditions.push(`${exists} (
        SELECT 1 FROM post_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE pt.post_id = posts.id 
        AND t.name = ? 
        AND t.namespace = ?
      )`);
      params.push(tag.name, tag.namespace);
    }

    // Basic order handling
    let orderBy = "ORDER BY created_at DESC, id DESC";
    let isAscending = false;

    switch (query.order) {
        case "id_desc": orderBy = "ORDER BY id DESC"; break;
        case "id_asc": orderBy = "ORDER BY id ASC"; isAscending = true; break;
        case "oldest": orderBy = "ORDER BY created_at ASC, id ASC"; isAscending = true; break;
    }

    // Cursor pagination logic
    if (query.before_id) {
      conditions.push(isAscending ? "id < ?" : "id < ?");
      params.push(query.before_id);
    }
    if (query.after_id) {
      conditions.push(isAscending ? "id > ?" : "id > ?");
      params.push(query.after_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitVal = query.limit || limit;
    
    const sql = `
      SELECT * FROM posts 
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    return db.query(sql).all(...params, limitVal, offset) as Post[];
  }

  /**
   * Counts total posts matching a SearchQuery.
   */
  static count(query: SearchQuery): number {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.rating) {
      conditions.push("rating = ?");
      params.push(query.rating);
    }

    for (const tag of query.tags) {
      const exists = tag.negated ? "NOT EXISTS" : "EXISTS";
      conditions.push(`${exists} (
        SELECT 1 FROM post_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE pt.post_id = posts.id 
        AND t.name = ? 
        AND t.namespace = ?
      )`);
      params.push(tag.name, tag.namespace);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT COUNT(*) as count FROM posts ${whereClause}`;
    
    const result = db.query(sql).get(...params) as { count: number };
    return result.count;
  }

  /**
   * Creates a new post and associates it with the provided tags.
   */
  static create(data: CreatePost, rawTags: string): number {
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO posts (
          hash, extension, mime_type, size_bytes, 
          width, height, duration, rating, source, parent_id, has_children
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.hash, data.extension, data.mime_type, data.size_bytes,
        data.width, data.height, data.duration, data.rating, data.source,
        data.parent_id, data.has_children ? 1 : 0
      );

      const postId = result.lastInsertRowid as number;

      // Process Tags
      const tagList = Array.from(new Set(rawTags.split(/\s+/).filter(t => t.length > 0)));
      for (const tagRaw of tagList) {
        const { name, namespace } = TagModel.parseRaw(tagRaw);
        const tagId = TagModel.getOrCreate(name, namespace);
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
      const newTagNames = Array.from(new Set(rawTags.split(/\s+/).filter(t => t.length > 0)));
      
      const currentTagMap = new Map(currentTags.map(t => [t.namespace + ":" + t.name, t]));
      const newTagParsed = newTagNames.map(t => TagModel.parseRaw(t));
      const newTagMap = new Map(newTagParsed.map(t => [t.namespace + ":" + t.name, t]));

      // Tags to remove
      for (const [key, tag] of currentTagMap) {
        if (!newTagMap.has(key)) {
          db.prepare("DELETE FROM post_tags WHERE post_id = ? AND tag_id = ?").run(postId, tag.id);
          TagModel.decrementCount(tag.id);
        }
      }

      // Tags to add
      for (const [key, tag] of newTagMap) {
        if (!currentTagMap.has(key)) {
          const tagId = TagModel.getOrCreate(tag.name, tag.namespace);
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

    await db.transaction(async () => {
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
      console.error(`Failed to delete files for post ${postId}:`, e);
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
 * Retrieves a single post by its ID.
 */
static getById(id: number): Post | undefined {
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
