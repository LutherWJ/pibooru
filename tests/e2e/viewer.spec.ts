import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startE2EServer, stopE2EServer } from "./test-server";
import { createAuthenticatedBrowser } from "./auth.setup";
import type { TestBrowser } from "./browser";

describe("Media Viewer", () => {
  let browser: TestBrowser;

  beforeAll(async () => {
    await startE2EServer();
    browser = await createAuthenticatedBrowser();
  });

  afterAll(async () => {
    await browser?.close();
    stopE2EServer();
  });

  test("should navigate to viewer and back", async () => {
    await browser.goto("/upload");
    await browser.setFileInput("#file-input", "tests/assets/test-image-1.png");
    await browser.fill('textarea[name="tags"]', "viewer_nav_test");
    await browser.click("#upload-button");
    await browser.waitForURL(/\/$/);

    await browser.click('a[href^="/viewer"]');
    await browser.waitForURL(/\/viewer/);
    await browser.waitForSelector("#viewer-container");
    expect(await browser.isVisible("#viewer-container")).toBe(true);

    await browser.click('.viewer-actions a[href="/"]');
    await browser.waitForURL(/\/$/);
    expect(await browser.getURL()).toMatch(/\/$/);
  });

  test("should support keyboard navigation in viewer", async () => {
    for (let i = 2; i <= 3; i++) {
      await browser.goto("/upload");
      await browser.setFileInput("#file-input", `tests/assets/test-image-${i}.png`);
      await browser.fill('textarea[name="tags"]', "viewer_test");
      await browser.click("#upload-button");
      await browser.waitForURL(/\/$/);
    }

    await browser.goto("/viewer?tags=viewer_test");
    await browser.waitForSelector(".viewer-media");
    const firstImageSrc = await browser.getAttribute(".viewer-media", "src");

    await browser.press("l");
    await Bun.sleep(500);

    const secondImageSrc = await browser.getAttribute(".viewer-media", "src");
    expect(secondImageSrc).not.toBe(firstImageSrc);

    await browser.press("h");
    await Bun.sleep(500);

    const backImageSrc = await browser.getAttribute(".viewer-media", "src");
    expect(backImageSrc).toBe(firstImageSrc);
  });
});
