# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: htmx.spec.ts >> HTMX Interactions >> should update tags via HTMX on post detail page
- Location: tests/e2e/htmx.spec.ts:13:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#edit-tags-button')

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
      - link "« Back to Gallery" [ref=e28] [cursor=pointer]:
        - /url: /
      - generic [ref=e29]:
        - heading "Tags" [level=2] [ref=e30]
        - list [ref=e31]:
          - listitem [ref=e32]:
            - link "?" [ref=e33] [cursor=pointer]:
              - /url: /?tags=common_1777681416027
            - link "common 1777681416027" [ref=e34] [cursor=pointer]:
              - /url: /?tags=common_1777681416027
            - text: "2"
          - listitem [ref=e35]:
            - link "?" [ref=e36] [cursor=pointer]:
              - /url: /?tags=stress_1777681416027_3
            - link "stress 1777681416027 3" [ref=e37] [cursor=pointer]:
              - /url: /?tags=stress_1777681416027_3
            - text: "1"
      - generic [ref=e38]:
        - heading "Information" [level=2] [ref=e39]
        - list [ref=e40]:
          - listitem [ref=e41]:
            - strong [ref=e42]: "ID:"
            - text: "3"
          - listitem [ref=e43]:
            - strong [ref=e44]: "Date:"
            - text: 5/2/2026
          - listitem [ref=e45]:
            - strong [ref=e46]: "Rating:"
            - text: s
          - listitem [ref=e47]:
            - strong [ref=e48]: "Size:"
            - text: 0.00 MB
          - listitem [ref=e49]:
            - strong [ref=e50]: "Dimensions:"
            - text: 100 x 100
      - generic [ref=e51]:
        - heading "Options" [level=2] [ref=e52]
        - list [ref=e53]:
          - listitem [ref=e54]:
            - link "View original file" [ref=e55] [cursor=pointer]:
              - /url: /data/original/eb/d9/ebd905d662d52ef253ebd0f53e5cf2d91ffd3e44cb1ae32180e4ccdb7bcd9a28.png
          - listitem [ref=e56]:
            - link "Edit tags" [ref=e57] [cursor=pointer]:
              - /url: "#"
          - listitem [ref=e58]:
            - link "Delete post" [ref=e59] [cursor=pointer]:
              - /url: "#"
          - listitem [ref=e60]:
            - link "Favorite" [ref=e61] [cursor=pointer]:
              - /url: "#"
    - img "Post 3" [ref=e64]
  - contentinfo [ref=e65]:
    - paragraph [ref=e66]: © 2026 PiBooru - Inspired by Danbooru
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('HTMX Interactions', () => {
  4  |   test('should show tag suggestions', async ({ page }) => {
  5  |     await page.goto('/upload');
  6  |     // Fill something that definitely exists (like 'a')
  7  |     await page.locator('textarea[name="tags"]').fill('a');
  8  |     // Wait for the suggestion box to appear and have content
  9  |     const suggestion = page.locator('.tag-suggestion').first();
  10 |     await expect(suggestion).toBeVisible({ timeout: 10000 });
  11 |   });
  12 | 
  13 |   test('should update tags via HTMX on post detail page', async ({ page }) => {
  14 |     // 1. Upload a fresh post to be sure it exists
  15 |     const uniqueTag = `htmx_upd_${Date.now()}`;
  16 |     await page.goto('/upload');
  17 |     const fileChooserPromise = page.waitForEvent('filechooser');
  18 |     await page.locator('#file-input').click();
  19 |     const fileChooser = await fileChooserPromise;
  20 |     await fileChooser.setFiles('tests/assets/test-image-1.png');
  21 |     await page.locator('textarea[name="tags"]').fill(uniqueTag);
  22 |     await page.locator('#upload-button').click();
  23 |     await page.waitForURL('/');
  24 | 
  25 |     // 2. Go to that specific post (it will be first)
  26 |     await page.locator('.post-thumbnail').first().click();
  27 |     await page.waitForURL(/\/post\/\d+/);
  28 | 
  29 |     // 3. Edit
> 30 |     await page.locator('#edit-tags-button').click();
     |                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  31 |     const editTag = `updated_${Date.now()}`;
  32 |     await page.locator('#edit-tags-form textarea').fill(`${uniqueTag} ${editTag}`);
  33 |     await page.locator('#edit-tags-form button[type="submit"]').click();
  34 | 
  35 |     // 4. Verify HTMX partial swap
  36 |     await expect(page.locator('.tag-list')).toContainText(editTag, { timeout: 10000 });
  37 |   });
  38 | });
  39 | 
```