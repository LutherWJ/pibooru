import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../index";
import { initDb, db } from "../db";
import { TagModel } from "../models/Tag";
import { UserModel } from "../models/User";

describe("TagController Autocomplete & Documentation", () => {
  let apiKey: string;

  beforeAll(async () => {
    await initDb();

    // Create user & API key
    const user = UserModel.findByUsername("tag_tester");
    const userId = user ? user.id : (await UserModel.create("tag_tester", "testpass123"))!;
    apiKey = UserModel.generateApiKey(userId);

    // Create some sample tags
    TagModel.getOrCreate("cat", "general");
    TagModel.getOrCreate("picasso", "artist");
  });

  it("should suggest order options when typing 'order:'", async () => {
    const res = await app.request("/partials/tags/suggestions?tags=order:", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("order:random");
    expect(html).toContain("order:newest");
    expect(html).toContain("order:oldest");
    expect(html).toContain("order:id_desc");
    expect(html).toContain("order:id_asc");
    expect(html).toContain("modifier");
  });

  it("should filter order options when typing 'order:r'", async () => {
    const res = await app.request("/partials/tags/suggestions?tags=order:r", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("order:random");
    expect(html).not.toContain("order:oldest");
  });

  it("should suggest rating options when typing 'rating:' or 'r:'", async () => {
    const res = await app.request("/partials/tags/suggestions?tags=rating:", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("rating:s");
    expect(html).toContain("rating:q");
    expect(html).toContain("rating:e");
  });

  it("should suggest type options when typing 'type:'", async () => {
    const res = await app.request("/partials/tags/suggestions?tags=type:", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("type:image");
    expect(html).toContain("type:video");
  });

  it("should suggest modifier prefix when typing before colon (e.g. 'ord')", async () => {
    const res = await app.request("/partials/tags/suggestions?tags=ord", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("order:");
    expect(html).toContain("modifier");
  });

  it("should preserve negation prefix (e.g. '-rating:')", async () => {
    const res = await app.request("/partials/tags/suggestions?tags=-rating:", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("-rating:s");
    expect(html).toContain("-rating:e");
  });

  it("should render the dedicated documentation page at /wiki_pages", async () => {
    const res = await app.request("/wiki_pages", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Search Syntax &amp; Query Engine Guide");
    expect(html).toContain("order:random");
    expect(html).toContain("Keyboard Navigation Cheat Sheet");
    expect(html).toContain("Clean Mode (/clean)");
  });

  it("should render the documentation page at /help/search", async () => {
    const res = await app.request("/help/search", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Search Syntax &amp; Query Engine Guide");
  });
});
