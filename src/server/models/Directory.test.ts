import { describe, it, expect, beforeAll } from "bun:test";
import { DirectoryModel } from "./Directory";
import { PostModel } from "./Post";
import { db, initDb } from "../db";

describe("DirectoryModel (Virtual File Explorer)", () => {
  let samplePost1Id: number;
  let samplePost2Id: number;

  beforeAll(async () => {
    await initDb();

    // Clear tables
    db.run("DELETE FROM directory_items");
    db.run("DELETE FROM directories WHERE id != 1");
    db.run("DELETE FROM post_tags");
    db.run("DELETE FROM posts");

    // Ensure root exists
    DirectoryModel.getRoot();

    // Create 2 sample posts
    samplePost1Id = PostModel.create({
      hash: "a".repeat(64),
      extension: ".png",
      mime_type: "image/png",
      size_bytes: 1024,
      width: 800,
      height: 600,
      duration: null,
      rating: "s",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null,
    }, "sample tag1");

    samplePost2Id = PostModel.create({
      hash: "b".repeat(64),
      extension: ".jpg",
      mime_type: "image/jpeg",
      size_bytes: 2048,
      width: 1920,
      height: 1080,
      duration: null,
      rating: "e",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null,
    }, "sample tag2");
  });

  it("should have canonical Root directory (id = 1)", () => {
    const root = DirectoryModel.getRoot();
    expect(root).toBeDefined();
    expect(root.id).toBe(1);
    expect(root.name).toBe("Root");
    expect(root.parent_id).toBeNull();
  });

  it("should create child directories and retrieve breadcrumbs", () => {
    const wallpapers = DirectoryModel.createDirectory(1, "Wallpapers");
    expect(wallpapers.name).toBe("Wallpapers");
    expect(wallpapers.parent_id).toBe(1);

    const anime = DirectoryModel.createDirectory(wallpapers.id, "Anime");
    expect(anime.name).toBe("Anime");
    expect(anime.parent_id).toBe(wallpapers.id);

    const crumbs = DirectoryModel.getBreadcrumbs(anime.id);
    expect(crumbs.length).toBe(3);
    expect(crumbs[0]!.name).toBe("Root");
    expect(crumbs[1]!.name).toBe("Wallpapers");
    expect(crumbs[2]!.name).toBe("Anime");

    const fullPath = DirectoryModel.getFullPath(anime.id);
    expect(fullPath).toBe("Root / Wallpapers / Anime");
  });

  it("should reject duplicate directory names under the same parent", () => {
    expect(() => {
      DirectoryModel.createDirectory(1, "Wallpapers");
    }).toThrow();
  });

  it("should rename and delete directories (preventing Root rename/delete)", () => {
    const tempDir = DirectoryModel.createDirectory(1, "Temp");
    const renamed = DirectoryModel.renameDirectory(tempDir.id, "TempRenamed");
    expect(renamed.name).toBe("TempRenamed");

    expect(() => {
      DirectoryModel.renameDirectory(1, "HackedRoot");
    }).toThrow();

    expect(() => {
      DirectoryModel.deleteDirectory(1);
    }).toThrow();

    DirectoryModel.deleteDirectory(renamed.id);
    expect(DirectoryModel.getById(renamed.id)).toBeUndefined();
  });

  it("should place posts into root and retrieve directory items", () => {
    DirectoryModel.addToRoot(samplePost1Id, "my_cat.png");
    DirectoryModel.addToRoot(samplePost2Id, "landscape.jpg");

    const rootItems = DirectoryModel.getItems(1);
    expect(rootItems.length).toBeGreaterThanOrEqual(2);

    const item1 = rootItems.find(i => i.post_id === samplePost1Id);
    expect(item1).toBeDefined();
    expect(item1!.custom_name).toBe("my_cat.png");
    expect(item1!.size_bytes).toBe(1024);
  });

  it("should copy an item to another folder and auto-suffix with (1) on collision", () => {
    const rootItems = DirectoryModel.getItems(1);
    const catItem = rootItems.find(i => i.post_id === samplePost1Id)!;

    const wallpapers = db.query("SELECT id FROM directories WHERE name = 'Wallpapers'").get() as { id: number };

    // First copy into Wallpapers
    const copied1 = DirectoryModel.copyItem(catItem.id, wallpapers.id);
    expect(copied1.directory_id).toBe(wallpapers.id);
    expect(copied1.custom_name).toBe("my_cat.png");

    // Let's create a second post with the same name in Root and copy it
    const samplePost3Id = PostModel.create({
      hash: "c".repeat(64),
      extension: ".png",
      mime_type: "image/png",
      size_bytes: 512,
      width: 400,
      height: 400,
      duration: null,
      rating: "s",
      source: "",
      parent_id: null,
      has_children: false,
      user_id: null,
    }, "sample tag3");

    DirectoryModel.addToRoot(samplePost3Id, "my_cat.png");
    const rootItemsUpdated = DirectoryModel.getItems(1);
    const cat3Item = rootItemsUpdated.find(i => i.post_id === samplePost3Id)!;

    // Copy second post into Wallpapers -> should auto-suffix (1)
    const copied2 = DirectoryModel.copyItem(cat3Item.id, wallpapers.id);
    expect(copied2.custom_name).toBe("my_cat (1).png");
  });

  it("should move an item (Cut & Paste) from one directory to another", () => {
    const wallpapers = db.query("SELECT id FROM directories WHERE name = 'Wallpapers'").get() as { id: number };
    const anime = db.query("SELECT id FROM directories WHERE name = 'Anime'").get() as { id: number };

    const wallpapersItems = DirectoryModel.getItems(wallpapers.id);
    const itemToMove = wallpapersItems[0]!;

    const moved = DirectoryModel.moveItem(itemToMove.id, anime.id);
    expect(moved.directory_id).toBe(anime.id);

    // Verify it is no longer in Wallpapers
    const afterWallpapers = DirectoryModel.getItems(wallpapers.id);
    expect(afterWallpapers.find(i => i.id === itemToMove.id)).toBeUndefined();

    // Verify it is in Anime
    const afterAnime = DirectoryModel.getItems(anime.id);
    expect(afterAnime.find(i => i.id === itemToMove.id)).toBeDefined();
  });

  it("should find all directory locations for a post", () => {
    // samplePost1Id was placed in Root and also in Anime (via copy & move)
    const locations = DirectoryModel.findLocationsForPost(samplePost1Id);
    expect(locations.length).toBeGreaterThanOrEqual(1);
    expect(locations.some(l => l.directoryId === 1)).toBe(true);
  });
});
