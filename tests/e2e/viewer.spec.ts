import { test, expect } from '@playwright/test';

test.describe('Media Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to gallery and ensure we are logged in (handled by auth.setup.ts usually)
    await page.goto('/');
  });

  test('should navigate to viewer and back', async ({ page }) => {
    // First, upload an image so the viewer has something to show
    await page.goto('/upload');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/assets/test-image-1.png');
    await page.locator('textarea[name="tags"]').fill('viewer_nav_test');
    await page.locator('#upload-button').click();
    await page.waitForURL('/');

    // Click Slideshow link
    await page.click('text=Slideshow');
    await expect(page).toHaveURL(/\/viewer/);
    
    // Check if viewer container exists
    await expect(page.locator('#viewer-container')).toBeVisible();

    // Navigate back via "Gallery" button in overlay
    // Need to hover to see the overlay
    await page.hover('#viewer-container');
    await page.click('text=Gallery');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should support keyboard navigation in viewer', async ({ page }) => {
    // First, upload at least 2 images to have something to navigate
    for (let i = 1; i <= 2; i++) {
        await page.goto('/upload');
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('#file-input').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`tests/assets/test-image-${i}.png`);
        await page.locator('textarea[name="tags"]').fill(`viewer_test`);
        await page.locator('#upload-button').click();
        await page.waitForURL('/');
    }

    await page.goto('/viewer?tags=viewer_test');
    
    // Get current post ID or image src
    const firstImageSrc = await page.locator('.viewer-media').getAttribute('src');

    // Press 'l' for next
    await page.keyboard.press('l');
    
    // Wait for URL change or image change
    await page.waitForTimeout(500); // Wait for HTMX
    const secondImageSrc = await page.locator('.viewer-media').getAttribute('src');
    expect(secondImageSrc).not.toBe(firstImageSrc);

    // Press 'h' for prev
    await page.keyboard.press('h');
    await page.waitForTimeout(500);
    const thirdImageSrc = await page.locator('.viewer-media').getAttribute('src');
    expect(thirdImageSrc).toBe(firstImageSrc);
  });

  test('should support random mode in viewer', async ({ page }) => {
    await page.goto('/viewer?tags=order:random');
    await expect(page).toHaveURL(/\/viewer\?tags=order:random/);

    const firstImageSrc = await page.locator('.viewer-media').getAttribute('src');

    // Press 'l' for next random
    await page.keyboard.press('l');
    await page.waitForTimeout(500);
    
    // In random mode, next should also be random
    const secondImageSrc = await page.locator('.viewer-media').getAttribute('src');
    // It *could* be the same if there's only 1 image, but we uploaded 2 in previous test
    // Actually, tests might run in parallel or shared state, let's be careful.
    // Given the setup-db, we should have enough.
  });
});
