import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startE2EServer, stopE2EServer } from "./test-server";
import { createAuthenticatedBrowser } from "./auth.setup";
import type { TestBrowser } from "./browser";

describe("History Stress Test", () => {
  let browser: TestBrowser;
  const runId = Date.now();

  beforeAll(async () => {
    await startE2EServer();
    browser = await createAuthenticatedBrowser();

    for (let i = 1; i <= 3; i++) {
      await browser.goto("/upload");
      await browser.setFileInput("#file-input", `tests/assets/test-image-${i}.png`);
      await browser.fill('textarea[name="tags"]', `stress_${runId}_${i} common_${runId}`);
      await browser.click("#upload-button");
      await browser.waitForURL(/\/$/);
    }
  });

  afterAll(async () => {
    await browser?.close();
    stopE2EServer();
  });

  test("should handle rapid navigation", async () => {
    await browser.goto(`/?tags=common_${runId}`);
    let listText = await browser.innerText(".tag-list");
    expect(listText).toContain(`common ${runId}`);

    await browser.click(".post-thumbnail");
    await browser.waitForURL(/\/post\/\d+/);
    await browser.goBack();

    expect(await browser.getURL()).toContain(`tags=common_${runId}`);
    listText = await browser.innerText(".tag-list");
    expect(listText).toContain(`common ${runId}`);
  });
});
