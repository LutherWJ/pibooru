import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startE2EServer, stopE2EServer } from "./test-server";
import { createAuthenticatedBrowser } from "./auth.setup";
import type { TestBrowser } from "./browser";

describe("Navigation History", () => {
  let browser: TestBrowser;

  beforeAll(async () => {
    await startE2EServer();
    browser = await createAuthenticatedBrowser();

    for (let i = 1; i <= 2; i++) {
      await browser.goto("/upload");
      await browser.setFileInput("#file-input", `tests/assets/test-image-${i}.png`);
      await browser.fill('textarea[name="tags"]', `history_${Date.now()}_${i}`);
      await browser.click("#upload-button");
      await browser.waitForURL(/\/$/);
    }
  });

  afterAll(async () => {
    await browser?.close();
    stopE2EServer();
  });

  test("should return to gallery using the UI Back button", async () => {
    await browser.goto("/");
    await browser.click(".post-thumbnail");
    await browser.waitForURL(/\/post\/\d+/);
    await browser.click("#back-to-search");
    await browser.waitForURL(/\/$/);
    expect(await browser.getURL()).toMatch(/\/$/);
  });

  test("should return to gallery using the Browser Back button", async () => {
    await browser.goto("/");
    await browser.click(".post-thumbnail");
    await browser.waitForURL(/\/post\/\d+/);
    await browser.goBack();
    expect(await browser.getURL()).toMatch(/\/$/);
  });

  test("should maintain search context when going back", async () => {
    await browser.goto("/");
    const tagText = await browser.innerText(".tag-list li a");
    const tagName = tagText.split(' ').slice(1).join(' ').trim();

    if (tagName) {
      await browser.goto(`/?tags=${encodeURIComponent(tagName)}`);
      let listText = await browser.innerText(".tag-list");
      expect(listText).toContain(tagName);

      await browser.click(".post-thumbnail");
      await browser.waitForURL(/\/post\/\d+/);
      await browser.goBack();

      expect(await browser.getURL()).toContain(`tags=${encodeURIComponent(tagName)}`);
      listText = await browser.innerText(".tag-list");
      expect(listText).toContain(tagName);
    }
  });
});
