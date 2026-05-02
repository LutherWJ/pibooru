import { test, expect } from '@playwright/test';

test.describe('History Stress Test', () => {
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    for (let i = 1; i <= 3; i++) {
      await page.goto('/upload');
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#file-input').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(`tests/assets/test-image-${i}.png`);
      await page.locator('textarea[name="tags"]').fill(`stress_${runId}_${i} common_${runId}`);
      await page.locator('#upload-button').click();
      await page.waitForURL('/');
    }
  });

  test('should handle rapid navigation', async ({ page }) => {
    await page.goto('/');
    const tagLink = page.locator('.tag-list li a').first();
    const commonTag = (await tagLink.innerText()).split(' ').slice(1).join(' ').trim();
    
    await page.goto(`/?tags=${commonTag}`);
    await expect(page.locator('.tag-list')).toContainText(commonTag);
    
    await page.locator('.post-thumbnail').first().click();
    await page.waitForURL(/\/post\/\d+/);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`\\/\\?tags=${commonTag}`));
    await expect(page.locator('.tag-list')).toContainText(commonTag);
  });
});
