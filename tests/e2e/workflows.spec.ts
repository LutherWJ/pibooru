import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startE2EServer, stopE2EServer } from "./test-server";
import { createAuthenticatedBrowser } from "./auth.setup";
import type { TestBrowser } from "./browser";

describe("Core Workflows", () => {
  let browser: TestBrowser;

  beforeAll(async () => {
    await startE2EServer();
    browser = await createAuthenticatedBrowser();
  });

  afterAll(async () => {
    await browser?.close();
    stopE2EServer();
  });

  test("should upload an image and show it in the gallery", async () => {
    await browser.goto("/upload");
    await browser.setFileInput("#file-input", "tests/assets/test-image-1.png");

    const uniqueTag = `tag_${Date.now()}`;
    await browser.fill('textarea[name="tags"]', uniqueTag);
    await browser.click("#upload-button");

    await browser.waitForURL(/\/$/);
    await browser.goto(`/?tags=${uniqueTag}`);
    await browser.waitForSelector(".post-thumbnail");
    expect(await browser.isVisible(".post-thumbnail")).toBe(true);
    expect(await browser.innerText(".tag-list")).toContain(uniqueTag.replace(/_/g, ' '));
  });

  test("should search for a post by tag", async () => {
    const searchTag = `search_${Date.now()}`;
    await browser.goto("/upload");
    await browser.setFileInput("#file-input", "tests/assets/test-image-2.png");
    await browser.fill('textarea[name="tags"]', searchTag);
    await browser.click("#upload-button");
    await browser.waitForURL(/\/$/);

    await browser.click("#tags");
    await browser.fill("#tags", searchTag);
    await browser.evaluate("document.querySelector('#tags')?.closest('form')?.requestSubmit()");

    await browser.waitForURL(new RegExp(`\\/\\?tags=${searchTag}`));
    expect(await browser.innerText(".tag-list")).toContain(searchTag.replace(/_/g, ' '));
  });
});
