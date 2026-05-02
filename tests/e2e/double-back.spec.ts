import { test, expect } from '@playwright/test';

test.describe('Double-Back Bug Reproduction', () => {
  test('should return to gallery with a single back action after editing tags', async ({ page }) => {
    await page.goto('/upload');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/assets/test-image-1.png');
    const uniqueTag = `bug_${Date.now()}`;
    await page.locator('textarea[name="tags"]').fill(uniqueTag);
    await page.locator('#upload-button').click();
    await page.waitForURL('/');

    await page.locator('.post-thumbnail').first().click();
    await page.waitForURL(/\/post\/\d+/);

    await page.locator('#edit-tags-link').click();
    await page.locator('#edit-tags-form textarea').fill(`${uniqueTag} fixed`);
    await page.locator('#edit-tags-form button[type="submit"]').click();
    await expect(page.locator('.tag-list')).toContainText('fixed');

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.tag-list')).toContainText(uniqueTag);
  });
});
