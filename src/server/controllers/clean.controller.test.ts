import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../index";
import { initDb, db } from "../db";
import { PostModel } from "../models/Post";
import { UserModel } from "../models/User";

describe("Clean Mode Controller", () => {
  let apiKey: string;
  let post1Id: number;
  let post2Id: number;
  let post3Id: number;

  beforeAll(async () => {
    await initDb();

    // Clean tables
    db.run("DELETE FROM post_tags");
    db.run("DELETE FROM tags");
    db.run("DELETE FROM posts");
    db.run("DELETE FROM users WHERE username = 'clean_tester'");

    // Create user & API key
    const userId = await UserModel.create("clean_tester", "testpass123");
    apiKey = UserModel.generateApiKey(userId!);

    // Seed 3 posts
    post1Id = PostModel.create({
      hash: "1".repeat(64),
      extension: ".jpg",
      mime_type: "image/jpeg",
      size_bytes: 1024,
      width: 800,
      height: 600,
      duration: null,
      rating: "s",
      source: "https://example.com/1",
      parent_id: null,
      has_children: false,
      user_id: userId
    }, "tag1 clean_test");

    post2Id = PostModel.create({
      hash: "2".repeat(64),
      extension: ".jpg",
      mime_type: "image/jpeg",
      size_bytes: 2048,
      width: 1024,
      height: 768,
      duration: null,
      rating: "q",
      source: "https://example.com/2",
      parent_id: null,
      has_children: false,
      user_id: userId
    }, "tag2 clean_test");

    post3Id = PostModel.create({
      hash: "3".repeat(64),
      extension: ".mp4",
      mime_type: "video/mp4",
      size_bytes: 4096,
      width: 1920,
      height: 1080,
      duration: 15,
      rating: "e",
      source: "https://example.com/3",
      parent_id: null,
      has_children: false,
      user_id: userId
    }, "video_tag clean_test");
  });

  it("should render the full clean slideshow UI on GET /clean", async () => {
    const res = await app.request("/clean", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("Clean Mode");
    expect(html).toContain("clean-container");
    expect(html).toContain("clean-stage");
    expect(html).toContain("clean-dock");
    
    // Check for left-handed keystroke cues
    expect(html).toContain("Left-Handed Keys:");
    expect(html).toContain("A");
    expect(html).toContain("D");
    expect(html).toContain("S / X");
    expect(html).toContain("Delete");
    expect(html).toContain("Keep");

    // Check media rendering
    expect(html).toContain("clean-media-element");
    // Newest post is post 3 (video)
    expect(html).toContain(`#${post3Id}`);
  });

  it("should return partial CleanStage when requested via HTMX", async () => {
    const res = await app.request("/clean", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "hx-request": "true",
      },
    });

    expect(res.status).toBe(200);
    const html = await res.text();

    // Partial response shouldn't have <html> doctype wrapper
    expect(html).not.toContain("<html lang=\"en\">");
    expect(html).toContain("id=\"clean-container\"");
    expect(html).toContain("clean-stage");
  });

  it("should filter posts by tags on GET /clean?tags=...", async () => {
    const res = await app.request("/clean?tags=tag1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`#${post1Id}`);
    expect(html).toContain("Remaining: <strong style=\"color: #38bdf8;\">1</strong>");
  });

  it("should support cursor pagination navigation", async () => {
    // Navigate to post older than post3Id
    const res = await app.request(`/clean?page=b${post3Id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`#${post2Id}`);
  });

  it("should delete a post via DELETE /clean/post/:id and advance to the next post", async () => {
    // Delete post 3
    const res = await app.request(`/clean/post/${post3Id}?tags=clean_test`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "hx-request": "true",
      },
    });

    expect(res.status).toBe(200);
    const pushUrl = res.headers.get("HX-Push-Url");
    expect(pushUrl).toContain(`/clean?tags=clean_test&page=b${post2Id}`);

    const html = await res.text();
    // Post 3 is deleted, should advance to post 2
    expect(html).toContain(`#${post2Id}`);
    expect(html).toContain(`Post #${post3Id} deleted`);

    // Verify post 3 is removed from the database
    const post3InDb = PostModel.getById(post3Id);
    expect(post3InDb).toBeNull();
  });

  it("should show empty/all-clean state when all posts are deleted", async () => {
    // Delete post 2
    await app.request(`/clean/post/${post2Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}`, "hx-request": "true" },
    });

    // Delete post 1 (the last post)
    const res = await app.request(`/clean/post/${post1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}`, "hx-request": "true" },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("All Clean!");
    expect(html).toContain("Return to Gallery");

    // Verify post 1 is deleted from DB
    expect(PostModel.getById(post1Id)).toBeNull();
  });
});
