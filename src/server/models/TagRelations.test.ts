import { describe, it, expect, beforeAll } from "bun:test";
import { TagModel } from "./Tag";
import { PostModel } from "./Post";
import { db, initDb } from "../db";

describe("Tag Aliases and Implications", () => {
  beforeAll(async () => {
    await initDb();
    db.run("DELETE FROM post_tags");
    db.run("DELETE FROM tag_aliases");
    db.run("DELETE FROM tag_implications");
    db.run("DELETE FROM posts");
    db.run("DELETE FROM tags");

    // Setup tags
    TagModel.getOrCreate("dog");
    TagModel.getOrCreate("animal");
    TagModel.getOrCreate("mammal");
  });

  it("should add and resolve aliases", () => {
    const dog = TagModel.getByName("dog")!;
    TagModel.addAlias(dog.id, "pup");
    
    const resolved = TagModel.resolveAlias("pup");
    expect(resolved).not.toBeNull();
    expect(resolved!.name).toBe("dog");
  });

  it("should add and retrieve implications", () => {
    const dog = TagModel.getByName("dog")!;
    const mammal = TagModel.getByName("mammal")!;
    const animal = TagModel.getByName("animal")!;

    TagModel.addImplication(dog.id, mammal.id);
    TagModel.addImplication(mammal.id, animal.id);

    const implications = TagModel.getImplications(dog.id);
    expect(implications.length).toBe(1);
    expect(implications[0]!.name).toBe("mammal");

    const allImplied = TagModel.getAllImpliedTagIds([dog.id]);
    expect(allImplied.length).toBe(3); // dog, mammal, animal
    expect(allImplied).toContain(dog.id);
    expect(allImplied).toContain(mammal.id);
    expect(allImplied).toContain(animal.id);
  });

  it("should resolve aliases and expand implications on post creation", () => {
    // pup (alias for dog) implies mammal, mammal implies animal
    const postId = (PostModel as any).create({
      hash: "a".repeat(64),
      extension: "jpg",
      mime_type: "image/jpeg",
      size_bytes: 1024,
      rating: "s"
    }, "pup");

    const tags = PostModel.getTags(postId);
    const tagNames = tags.map(t => t.name);
    
    expect(tagNames).toContain("dog");
    expect(tagNames).toContain("mammal");
    expect(tagNames).toContain("animal");
    expect(tagNames).not.toContain("pup");
  });

  it("should resolve aliases during search", () => {
    // Search for 'pup' should find the post tagged with 'dog'
    const results = PostModel.search({
      tags: [{ name: "pup", namespace: "general", negated: false }]
    });
    
    expect(results.length).toBe(1);
    expect(results[0]!.hash).toBe("a".repeat(64));
  });
});
