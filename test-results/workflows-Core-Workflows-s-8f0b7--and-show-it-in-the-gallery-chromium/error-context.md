# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflows.spec.ts >> Core Workflows >> should upload an image and show it in the gallery
- Location: tests/e2e/workflows.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.post-thumbnail').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.post-thumbnail').first()

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
        - link "Logout" [ref=e16] [cursor=pointer]:
          - /url: /logout
  - navigation [ref=e17]:
    - list [ref=e18]:
      - listitem [ref=e19]:
        - link "Listing" [ref=e20] [cursor=pointer]:
          - /url: /
      - listitem [ref=e21]:
        - link "Upload" [ref=e22] [cursor=pointer]:
          - /url: /upload
      - listitem [ref=e23]:
        - link "Wiki" [ref=e24] [cursor=pointer]:
          - /url: /wiki_pages
  - generic [ref=e25]:
    - complementary [ref=e26]:
      - generic [ref=e27]:
        - heading "Search" [level=2] [ref=e28]
        - textbox "Tags" [ref=e30]: tag_1777681462229
      - generic [ref=e32]:
        - heading "Tags" [level=2] [ref=e33]
        - list [ref=e34]:
          - listitem [ref=e35]: No tags found.
    - generic [ref=e38]:
      - paragraph [ref=e39]: No posts found.
      - link "Upload something?" [ref=e40] [cursor=pointer]:
        - /url: /upload
  - contentinfo [ref=e41]:
    - paragraph [ref=e42]: © 2026 PiBooru - Inspired by Danbooru
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Core Workflows', () => {
  4  |   test('should upload an image and show it in the gallery', async ({ page }) => {
  5  |     await page.goto('/upload');
  6  |     const fileChooserPromise = page.waitForEvent('filechooser');
  7  |     await page.locator('#file-input').click();
  8  |     const fileChooser = await fileChooserPromise;
  9  |     await fileChooser.setFiles('tests/assets/test-image-1.png');
  10 | 
  11 |     const uniqueTag = `tag_${Date.now()}`;
  12 |     await page.locator('textarea[name="tags"]').fill(uniqueTag);
  13 |     await page.locator('#upload-button').click();
  14 | 
  15 |     await page.waitForURL('/');
  16 |     await page.goto(`/?tags=${uniqueTag}`);
> 17 |     await expect(page.locator('.post-thumbnail').first()).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  18 |     await expect(page.locator('.tag-list')).toContainText(uniqueTag);
  19 |   });
  20 | 
  21 |   test('should search for a post by tag', async ({ page }) => {
  22 |     const searchTag = `search_${Date.now()}`;
  23 |     await page.goto('/upload');
  24 |     const fileChooserPromise = page.waitForEvent('filechooser');
  25 |     await page.locator('#file-input').click();
  26 |     const fileChooser = await fileChooserPromise;
  27 |     await fileChooser.setFiles('tests/assets/test-image-2.png');
  28 |     await page.locator('textarea[name="tags"]').fill(searchTag);
  29 |     await page.locator('#upload-button').click();
  30 |     await page.waitForURL('/');
  31 | 
  32 |     await page.locator('#tags').fill(searchTag);
  33 |     await page.keyboard.press('Enter');
  34 |     
  35 |     await expect(page).toHaveURL(new RegExp(`\\/\\?tags=${searchTag}`));
  36 |     await expect(page.locator('.post-thumbnail')).toContainText(''); // Ensure at least one thumbnail is there
  37 |     await expect(page.locator('.tag-list')).toContainText(searchTag);
  38 |   });
  39 | });
  40 | 
```