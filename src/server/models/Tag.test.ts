import { describe, it, expect, beforeAll } from "bun:test";
import { TagModel } from "./Tag";
import { db } from "../db";

describe("TagModel Search", () => {
  beforeAll(() => {
    db.run("DELETE FROM post_tags");
    db.run("DELETE FROM tags");

    TagModel.upsert("apple", "general");
    TagModel.upsert("apply", "general");
    TagModel.upsert("artist_apple", "artist");
    TagModel.upsert("banana", "general");
    
    // Increment post count for one
    db.run("UPDATE tags SET post_count = 10 WHERE name = 'apply'");
  });

  it("finds tags by prefix", () => {
    const results = TagModel.search("app");
    expect(results.length).toBe(2);
    // Should prioritize higher post count
    expect(results[0]!.name).toBe("apply");
  });

  it("finds tags by namespace and prefix", () => {
    const results = TagModel.search("artist:art");
    expect(results.length).toBe(1);
    expect(results[0]!.name).toBe("artist_apple");
    expect(results[0]!.namespace).toBe("artist");
  });

  it("returns empty for no match", () => {
    const results = TagModel.search("xyz");
    expect(results.length).toBe(0);
  });
});
