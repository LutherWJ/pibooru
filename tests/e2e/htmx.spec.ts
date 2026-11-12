import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startE2EServer, stopE2EServer } from "./test-server";
import { createAuthenticatedBrowser } from "./auth.setup";
import { TagModel } from "../../src/server/models/Tag";
import type { TestBrowser } from "./browser";

describe("HTMX Interactions", () => {
  let browser: TestBrowser;

  beforeAll(async () => {
    await startE2EServer();
    TagModel.getOrCreate("tag_example", "general");
    browser = await createAuthenticatedBrowser();
  });

  afterAll(async () => {
    await browser?.close();
    stopE2EServer();
  });

  test("should show tag suggestions", async () => {
    await browser.goto("/upload");
    await browser.fill('textarea[name="tags"]', "tag_");
    await browser.waitForSelector(".suggestion-item", 5000);
    const visible = await browser.isVisible(".suggestion-item");
    expect(visible).toBe(true);
  });

  test("should update tags via HTMX on post detail page", async () => {
    const uniqueTag = `htmx_upd_${Date.now()}`;
    await browser.goto("/upload");
    await browser.setFileInput("#file-input", "tests/assets/test-image-1.png");
    await browser.fill('textarea[name="tags"]', uniqueTag);
    await browser.click("#upload-button");
    await browser.waitForURL(/\/$/);

    await browser.click(".post-thumbnail");
    await browser.waitForURL(/\/post\/\d+/);

    await browser.click("#edit-tags-link");
    const editTag = `updated_${Date.now()}`;
    await browser.fill("#edit-tags-form textarea", `${uniqueTag} ${editTag}`);
    await browser.click('#edit-tags-form button[type="submit"]');

    await browser.waitForSelector(".tag-list");
    const tagListText = await browser.innerText(".tag-list");
    expect(tagListText).toContain(editTag.replace(/_/g, ' '));
  });
});
