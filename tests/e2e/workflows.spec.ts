import { test, expect } from '@playwright/test';

test.describe('Core Workflows', () => {
  test('should upload an image and show it in the gallery', async ({ page }) => {
    await page.goto('/upload');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/assets/test-image-1.png');

    const uniqueTag = `tag_${Date.now()}`;
    await page.locator('textarea[name="tags"]').fill(uniqueTag);
    await page.locator('#upload-button').click();

    await page.waitForURL('/');
    await page.goto(`/?tags=${uniqueTag}`);
    await expect(page.locator('.post-thumbnail').first()).toBeVisible();
    await expect(page.locator('.tag-list')).toContainText(uniqueTag);
  });

  test('should search for a post by tag', async ({ page }) => {
    const searchTag = `search_${Date.now()}`;
    await page.goto('/upload');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/assets/test-image-2.png');
    await page.locator('textarea[name="tags"]').fill(searchTag);
    await page.locator('#upload-button').click();
    await page.waitForURL('/');

    await page.locator('#tags').fill(searchTag);
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL(new RegExp(`\\/\\?tags=${searchTag}`));
    await expect(page.locator('.post-thumbnail')).toContainText(''); // Ensure at least one thumbnail is there
    await expect(page.locator('.tag-list')).toContainText(searchTag);
  });
});
