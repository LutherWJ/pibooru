import { test, expect } from '@playwright/test';

test.describe('HTMX Interactions', () => {
  test('should show tag suggestions', async ({ page }) => {
    await page.goto('/upload');
    // We just uploaded several images with tags starting with 'tag_'
    await page.locator('textarea[name="tags"]').fill('tag_');
    const suggestion = page.locator('.tag-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 10000 });
  });

  test('should update tags via HTMX on post detail page', async ({ page }) => {
    // 1. Upload a fresh post to be sure it exists
    const uniqueTag = `htmx_upd_${Date.now()}`;
    await page.goto('/upload');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/assets/test-image-1.png');
    await page.locator('textarea[name="tags"]').fill(uniqueTag);
    await page.locator('#upload-button').click();
    await page.waitForURL('/');

    // 2. Go to that specific post (it will be first if ordered by ID desc)
    await page.locator('.post-thumbnail').first().click();
    await page.waitForURL(/\/post\/\d+/);

    // 3. Edit
    await page.locator('#edit-tags-link').click();
    const editTag = `updated_${Date.now()}`;
    await page.locator('#edit-tags-form textarea').fill(`${uniqueTag} ${editTag}`);
    await page.locator('#edit-tags-form button[type="submit"]').click();

    // 4. Verify HTMX partial swap
    await expect(page.locator('.tag-list')).toContainText(editTag.replace(/_/g, ' '), { timeout: 10000 });
  });
});
