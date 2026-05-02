import { test, expect } from '@playwright/test';

test.describe('Navigation History', () => {
  test.beforeEach(async ({ page }) => {
    for (let i = 1; i <= 2; i++) {
      await page.goto('/upload');
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#file-input').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(`tests/assets/test-image-${i}.png`);
      await page.locator('textarea[name="tags"]').fill(`history_${Date.now()}_${i}`);
      await page.locator('#upload-button').click();
      await page.waitForURL('/');
    }
  });

  test('should return to gallery using the UI Back button', async ({ page }) => {
    await page.goto('/');
    await page.locator('.post-thumbnail').first().click();
    await page.waitForURL(/\/post\/\d+/);
    await page.locator('#back-to-search').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should return to gallery using the Browser Back button', async ({ page }) => {
    await page.goto('/');
    await page.locator('.post-thumbnail').nth(1).click();
    await page.waitForURL(/\/post\/\d+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should maintain search context when going back', async ({ page }) => {
    await page.goto('/');
    const tagLink = page.locator('.tag-list li a').first();
    const tagName = (await tagLink.innerText()).split(' ').slice(1).join(' ').trim();
    
    await page.goto(`/?tags=${tagName}`);
    await expect(page.locator('.tag-list')).toContainText(tagName);

    await page.locator('.post-thumbnail').first().click();
    await page.waitForURL(/\/post\/\d+/);
    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`\\/\\?tags=${tagName}`));
    await expect(page.locator('.tag-list')).toContainText(tagName);
  });
});
