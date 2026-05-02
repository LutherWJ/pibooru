# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: double-back.spec.ts >> Double-Back Bug Reproduction >> should return to gallery with a single back action after editing tags
- Location: tests/e2e/double-back.spec.ts:4:3

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
              - /url: /?tags=bug_1777681384883
            - link "bug 1777681384883" [ref=e34] [cursor=pointer]:
              - /url: /?tags=bug_1777681384883
            - text: "1"
      - generic [ref=e35]:
        - heading "Information" [level=2] [ref=e36]
        - list [ref=e37]:
          - listitem [ref=e38]:
            - strong [ref=e39]: "ID:"
            - text: "1"
          - listitem [ref=e40]:
            - strong [ref=e41]: "Date:"
            - text: 5/2/2026
          - listitem [ref=e42]:
            - strong [ref=e43]: "Rating:"
            - text: s
          - listitem [ref=e44]:
            - strong [ref=e45]: "Size:"
            - text: 0.00 MB
          - listitem [ref=e46]:
            - strong [ref=e47]: "Dimensions:"
            - text: 100 x 100
      - generic [ref=e48]:
        - heading "Options" [level=2] [ref=e49]
        - list [ref=e50]:
          - listitem [ref=e51]:
            - link "View original file" [ref=e52] [cursor=pointer]:
              - /url: /data/original/f7/36/f736ac7aa980d66a2e8cb6ffb0be8f82a8494697957e4569ff9347ca3c00b08a.png
          - listitem [ref=e53]:
            - link "Edit tags" [ref=e54] [cursor=pointer]:
              - /url: "#"
          - listitem [ref=e55]:
            - link "Delete post" [ref=e56] [cursor=pointer]:
              - /url: "#"
          - listitem [ref=e57]:
            - link "Favorite" [ref=e58] [cursor=pointer]:
              - /url: "#"
    - img "Post 1" [ref=e61]
  - contentinfo [ref=e62]:
    - paragraph [ref=e63]: © 2026 PiBooru - Inspired by Danbooru
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Double-Back Bug Reproduction', () => {
  4  |   test('should return to gallery with a single back action after editing tags', async ({ page }) => {
  5  |     await page.goto('/upload');
  6  |     const fileChooserPromise = page.waitForEvent('filechooser');
  7  |     await page.locator('#file-input').click();
  8  |     const fileChooser = await fileChooserPromise;
  9  |     await fileChooser.setFiles('tests/assets/test-image-1.png');
  10 |     const uniqueTag = `bug_${Date.now()}`;
  11 |     await page.locator('textarea[name="tags"]').fill(uniqueTag);
  12 |     await page.locator('#upload-button').click();
  13 |     await page.waitForURL('/');
  14 | 
  15 |     await page.locator('.post-thumbnail').first().click();
  16 |     await page.waitForURL(/\/post\/\d+/);
  17 | 
> 18 |     await page.locator('#edit-tags-button').click();
     |                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  19 |     await page.locator('#edit-tags-form textarea').fill(`${uniqueTag} fixed`);
  20 |     await page.locator('#edit-tags-form button[type="submit"]').click();
  21 |     await expect(page.locator('.tag-list')).toContainText('fixed');
  22 | 
  23 |     await page.goBack();
  24 |     await expect(page).toHaveURL(/\/$/);
  25 |     await expect(page.locator('.tag-list')).toContainText(uniqueTag);
  26 |   });
  27 | });
  28 | 
```