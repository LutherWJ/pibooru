# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: viewer.spec.ts >> Media Viewer >> should navigate to viewer and back
- Location: tests/e2e/viewer.spec.ts:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#viewer-container')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#viewer-container')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "PiBooru" [level=1] [ref=e3]:
      - link "PiBooru" [ref=e4] [cursor=pointer]:
        - /url: /
    - list [ref=e5]:
      - listitem [ref=e6]:
        - link "Posts" [ref=e7] [cursor=pointer]:
          - /url: /
      - listitem [ref=e8]:
        - link "Tags" [ref=e9] [cursor=pointer]:
          - /url: /tags
      - listitem [ref=e10]:
        - link "Upload" [ref=e11] [cursor=pointer]:
          - /url: /upload
      - listitem [ref=e12]:
        - link "Help (?)" [ref=e13] [cursor=pointer]:
          - /url: "#"
      - listitem [ref=e14]: testuser
      - listitem [ref=e15]:
        - link "Settings" [ref=e16] [cursor=pointer]:
          - /url: /settings
      - listitem [ref=e17]:
        - link "Logout" [ref=e18] [cursor=pointer]:
          - /url: /logout
  - navigation [ref=e19]:
    - list [ref=e20]:
      - listitem [ref=e21]:
        - link "Listing" [ref=e22] [cursor=pointer]:
          - /url: /
      - listitem [ref=e23]:
        - link "Upload" [ref=e24] [cursor=pointer]:
          - /url: /upload
      - listitem [ref=e25]:
        - link "Wiki" [ref=e26] [cursor=pointer]:
          - /url: /wiki_pages
  - generic [ref=e28]:
    - heading "No media found" [level=2] [ref=e29]
    - paragraph [ref=e30]: Try broadening your search parameters.
    - link "Back to Gallery" [ref=e31] [cursor=pointer]:
      - /url: /
  - contentinfo [ref=e32]:
    - paragraph [ref=e33]: © 2026 PiBooru - Inspired by Danbooru
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Media Viewer', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Navigate to gallery and ensure we are logged in (handled by auth.setup.ts usually)
  6  |     await page.goto('/');
  7  |   });
  8  | 
  9  |   test('should navigate to viewer and back', async ({ page }) => {
  10 |     // Click Slideshow link
  11 |     await page.click('text=Slideshow');
  12 |     await expect(page).toHaveURL(/\/viewer/);
  13 |     
  14 |     // Check if viewer container exists
> 15 |     await expect(page.locator('#viewer-container')).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  16 | 
  17 |     // Navigate back via "Gallery" button in overlay
  18 |     // Need to hover to see the overlay
  19 |     await page.hover('#viewer-container');
  20 |     await page.click('text=Gallery');
  21 |     await expect(page).toHaveURL(/\/$/);
  22 |   });
  23 | 
  24 |   test('should support keyboard navigation in viewer', async ({ page }) => {
  25 |     // First, upload at least 2 images to have something to navigate
  26 |     for (let i = 1; i <= 2; i++) {
  27 |         await page.goto('/upload');
  28 |         const fileChooserPromise = page.waitForEvent('filechooser');
  29 |         await page.locator('#file-input').click();
  30 |         const fileChooser = await fileChooserPromise;
  31 |         await fileChooser.setFiles(`tests/assets/test-image-${i}.png`);
  32 |         await page.locator('textarea[name="tags"]').fill(`viewer_test`);
  33 |         await page.locator('#upload-button').click();
  34 |         await page.waitForURL('/');
  35 |     }
  36 | 
  37 |     await page.goto('/viewer?tags=viewer_test');
  38 |     
  39 |     // Get current post ID or image src
  40 |     const firstImageSrc = await page.locator('.viewer-media').getAttribute('src');
  41 | 
  42 |     // Press 'l' for next
  43 |     await page.keyboard.press('l');
  44 |     
  45 |     // Wait for URL change or image change
  46 |     await page.waitForTimeout(500); // Wait for HTMX
  47 |     const secondImageSrc = await page.locator('.viewer-media').getAttribute('src');
  48 |     expect(secondImageSrc).not.toBe(firstImageSrc);
  49 | 
  50 |     // Press 'h' for prev
  51 |     await page.keyboard.press('h');
  52 |     await page.waitForTimeout(500);
  53 |     const thirdImageSrc = await page.locator('.viewer-media').getAttribute('src');
  54 |     expect(thirdImageSrc).toBe(firstImageSrc);
  55 |   });
  56 | 
  57 |   test('should support random mode in viewer', async ({ page }) => {
  58 |     await page.goto('/viewer?tags=order:random');
  59 |     await expect(page).toHaveURL(/\/viewer\?tags=order:random/);
  60 | 
  61 |     const firstImageSrc = await page.locator('.viewer-media').getAttribute('src');
  62 | 
  63 |     // Press 'l' for next random
  64 |     await page.keyboard.press('l');
  65 |     await page.waitForTimeout(500);
  66 |     
  67 |     // In random mode, next should also be random
  68 |     const secondImageSrc = await page.locator('.viewer-media').getAttribute('src');
  69 |     // It *could* be the same if there's only 1 image, but we uploaded 2 in previous test
  70 |     // Actually, tests might run in parallel or shared state, let's be careful.
  71 |     // Given the setup-db, we should have enough.
  72 |   });
  73 | });
  74 | 
```