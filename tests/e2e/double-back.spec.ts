import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startE2EServer, stopE2EServer } from "./test-server";
import { createAuthenticatedBrowser } from "./auth.setup";
import type { TestBrowser } from "./browser";

describe("Double-Back Bug Reproduction", () => {
  let browser: TestBrowser;

  beforeAll(async () => {
    await startE2EServer();
    browser = await createAuthenticatedBrowser();
  });

  afterAll(async () => {
    await browser?.close();
    stopE2EServer();
  });

  test("should return to gallery with a single back action after editing tags", async () => {
    await browser.goto("/upload");
    await browser.setFileInput("#file-input", "tests/assets/test-image-1.png");
    const uniqueTag = `bug_${Date.now()}`;
    await browser.fill('textarea[name="tags"]', uniqueTag);
    await browser.click("#upload-button");
    await browser.waitForURL(/\/$/);

    await browser.click(".post-thumbnail");
    await browser.waitForURL(/\/post\/\d+/);

    await browser.click("#edit-tags-link");
    await browser.fill("#edit-tags-form textarea", `${uniqueTag} fixed`);
    await browser.click('#edit-tags-form button[type="submit"]');

    await browser.waitForSelector(".tag-list");
    const tagListText = await browser.innerText(".tag-list");
    expect(tagListText).toContain("fixed");

    await browser.goBack();
    expect(await browser.getURL()).toMatch(/\/$/);
    const homeTagList = await browser.innerText(".tag-list");
    expect(homeTagList).toContain(uniqueTag.replace(/_/g, ' '));
  }, 30000);
});
