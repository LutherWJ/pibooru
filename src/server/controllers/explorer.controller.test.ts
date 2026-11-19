import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../index";
import { initDb, db } from "../db";
import { UserModel } from "../models/User";
import { PostModel } from "../models/Post";
import { DirectoryModel } from "../models/Directory";

describe("Explorer Controller & Endpoints", () => {
  let apiKey: string;
  let samplePostId: number;

  beforeAll(async () => {
    await initDb();

    // Clear tables
    db.run("DELETE FROM directory_items");
    db.run("DELETE FROM directories WHERE id != 1");
    db.run("DELETE FROM post_tags");
    db.run("DELETE FROM posts");
    db.run("DELETE FROM users WHERE username = 'explorer_tester'");

    // Create user & API key
    const userId = await UserModel.create("explorer_tester", "testpass123");
    apiKey = UserModel.generateApiKey(userId!);

    // Ensure root exists
    DirectoryModel.getRoot();

    // Create post
    samplePostId = PostModel.create({
      hash: "e".repeat(64),
      extension: ".png",
      mime_type: "image/png",
      size_bytes: 4096,
      width: 1200,
      height: 900,
      duration: null,
      rating: "s",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: userId,
    }, "explorer_tag");

    DirectoryModel.addToRoot(samplePostId, "test_image.png");
  });

  it("should render Explorer page on GET /explorer", async () => {
    const res = await app.request("/explorer", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("explorer-content");
    expect(html).toContain("Root");
    expect(html).toContain("test_image.png");
  });

  it("should support HTMX partial swaps on GET /explorer", async () => {
    const res = await app.request("/explorer?dir=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HX-Request": "true",
      },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("id=\"explorer-content\"");
    expect(html).not.toContain("<!DOCTYPE html>");
  });

  it("should create, rename, and delete a folder via API endpoints", async () => {
    // 1. Create folder
    const formData = new FormData();
    formData.append("parent_id", "1");
    formData.append("name", "TestFolder");

    const createRes = await app.request("/explorer/folders", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    expect(createRes.status).toBe(200);
    const createData = (await createRes.json()) as any;
    const folderId = createData.folder.id;

    // 2. Rename folder
    const renameData = new FormData();
    renameData.append("name", "RenamedFolder");
    const renameRes = await app.request(`/explorer/folders/${folderId}/rename`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: renameData,
    });
    expect(renameRes.status).toBe(200);

    // 3. Delete folder
    const deleteRes = await app.request(`/explorer/folders/${folderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(deleteRes.status).toBe(200);
  });

  it("should handle paste operations (cut/copy) via POST /explorer/paste", async () => {
    // Create destination folder
    const targetFolder = DirectoryModel.createDirectory(1, "PasteTarget");

    const rootItems = DirectoryModel.getItems(1);
    const item = rootItems[0]!;

    // Copy item into PasteTarget
    const pasteRes = await app.request("/explorer/paste", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "copy",
        itemIds: [item.id],
        targetDirId: targetFolder.id,
      }),
    });
    expect(pasteRes.status).toBe(200);

    // Verify item is now in PasteTarget
    const targetItems = DirectoryModel.getItems(targetFolder.id);
    expect(targetItems.length).toBe(1);
    expect(targetItems[0]!.post_id).toBe(item.post_id);

    // Also test moving a folder via POST /explorer/paste
    const subFolder = DirectoryModel.createDirectory(1, "SubFolderToMove");
    const moveFolderRes = await app.request("/explorer/paste", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "cut",
        folderIds: [subFolder.id],
        targetDirId: targetFolder.id,
      }),
    });
    expect(moveFolderRes.status).toBe(200);
    const moved = DirectoryModel.getById(subFolder.id);
    expect(moved?.parent_id).toBe(targetFolder.id);
  });

  it("should handle batch deletion via POST /explorer/batch-delete", async () => {
    const folderA = DirectoryModel.createDirectory(1, "BatchDeleteFolder");
    const item = DirectoryModel.getItems(1)[0]!;

    const res = await app.request("/explorer/batch-delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemIds: [item.id],
        folderIds: [folderA.id],
      }),
    });
    expect(res.status).toBe(200);
    expect(DirectoryModel.getById(folderA.id)).toBeUndefined();
  });

  it("should return post directory locations on GET /explorer/post-locations/:postId", async () => {
    const res = await app.request(`/explorer/post-locations/${samplePostId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("location-picker-content");
    expect(html).toContain("Root");
  });

  it("should stream next items chunk on GET /explorer/items-chunk", async () => {
    DirectoryModel.addToRoot(samplePostId, "chunk_test.png");
    const res = await app.request(`/explorer/items-chunk?dir=1&offset=0&view=grid&sort=name`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("explorer-item file-item");
  });
});
