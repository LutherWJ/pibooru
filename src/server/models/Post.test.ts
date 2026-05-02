import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PostModel } from "./Post";
import { SearchParser } from "../util/SearchParser";
import { db, initDb } from "../db";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Note: In a real scenario, we'd want to ensure we're using a test DB.
// Since db is a singleton, we'll just clear the tables we use.

describe("PostModel Search", () => {
  beforeAll(async () => {
    // Ensure DB is initialized (runs migrations)
    await initDb();
    
    // Clear tables
    db.run("DELETE FROM post_tags");
    db.run("DELETE FROM tags");
    db.run("DELETE FROM posts");

    // Seed data
    PostModel.create({
      hash: "1".repeat(64),
      extension: "jpg",
      mime_type: "image/jpeg",
      size_bytes: 100,
      width: 100,
      height: 100,
      duration: null,
      rating: "s",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null
    }, "cat animal");

    PostModel.create({
      hash: "2".repeat(64),
      extension: "jpg",
      mime_type: "image/jpeg",
      size_bytes: 200,
      width: 200,
      height: 200,
      duration: null,
      rating: "q",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null
    }, "dog animal artist:bob");

    PostModel.create({
      hash: "3".repeat(64),
      extension: "jpg",
      mime_type: "image/jpeg",
      size_bytes: 300,
      width: 300,
      height: 300,
      duration: null,
      rating: "e",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null
    }, "cat dog");

    PostModel.create({
      hash: "4".repeat(64),
      extension: "mp4",
      mime_type: "video/mp4",
      size_bytes: 400,
      width: 400,
      height: 400,
      duration: 10,
      rating: "s",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null
    }, "video_tag");
  });

  it("finds posts by single tag", () => {
    const query = SearchParser.parse("cat");
    const results = PostModel.search(query);
    expect(results.length).toBe(2);
  });

  it("finds posts by multiple tags (AND)", () => {
    const query = SearchParser.parse("cat dog");
    const results = PostModel.search(query);
    expect(results.length).toBe(1);
    expect(results[0]!.hash).toBe("3".repeat(64));
  });

  it("excludes posts with negated tags", () => {
    const query = SearchParser.parse("animal -dog");
    const results = PostModel.search(query);
    expect(results.length).toBe(1);
    expect(results[0]!.hash).toBe("1".repeat(64));
  });

  it("filters by rating", () => {
    const query = SearchParser.parse("rating:q");
    const results = PostModel.search(query);
    expect(results.length).toBe(1);
    expect(results[0]!.hash).toBe("2".repeat(64));
  });

  it("filters by namespaced tags", () => {
    const query = SearchParser.parse("artist:bob");
    const results = PostModel.search(query);
    expect(results.length).toBe(1);
    expect(results[0]!.hash).toBe("2".repeat(64));
  });

  it("filters by type:video", () => {
    const query = SearchParser.parse("type:video");
    const results = PostModel.search(query);
    expect(results.length).toBe(1);
    expect(results[0]!.mime_type).toBe("video/mp4");
  });

  it("filters by type:image", () => {
    const query = SearchParser.parse("type:image");
    const results = PostModel.search(query);
    expect(results.length).toBe(3);
    expect(results.every(r => r.mime_type.startsWith("image/"))).toBe(true);
  });

  it("combines everything", () => {
    const query = SearchParser.parse("animal artist:bob rating:q");
    const results = PostModel.search(query);
    expect(results.length).toBe(1);
    expect(results[0]!.hash).toBe("2".repeat(64));
  });
  
  it("returns nothing for non-existent tags", () => {
      const query = SearchParser.parse("nonexistent");
      const results = PostModel.search(query);
      expect(results.length).toBe(0);
  });
});
