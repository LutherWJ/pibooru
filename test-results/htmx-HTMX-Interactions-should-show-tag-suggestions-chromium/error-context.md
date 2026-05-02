# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: htmx.spec.ts >> HTMX Interactions >> should show tag suggestions
- Location: tests/e2e/htmx.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.tag-suggestion').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.tag-suggestion').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - heading "Upload Help" [level=2] [ref=e28]
        - paragraph [ref=e29]:
          - text: Support for JPG, PNG, WEBP, GIF, MP4, and WebM.
          - text: Tags should be space-separated. Use
          - code [ref=e30]: artist:name
          - text: ","
          - code [ref=e31]: character:name
          - text: ", etc."
    - generic [ref=e32]:
      - heading "Upload" [level=1] [ref=e33]
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Files
            - button "Choose File" [ref=e38]
          - generic [ref=e39]:
            - generic [ref=e40]:
              - generic [ref=e41]: Rating
              - combobox [ref=e42]:
                - option "Safe" [selected]
                - option "Questionable"
                - option "Explicit"
            - generic [ref=e43]:
              - generic [ref=e44]: Source
              - textbox "https://..." [ref=e45]
          - generic [ref=e46]:
            - generic [ref=e47]: Tags
            - textbox "artist:picasso character:mona_lisa general:smile" [active] [ref=e48]: a
          - button "Upload" [ref=e50] [cursor=pointer]
          - generic [ref=e51]:
            - heading "Queue" [level=3] [ref=e52]
            - list [ref=e53]:
              - listitem [ref=e54]: No files selected
        - paragraph [ref=e56]: No file selected
  - contentinfo [ref=e57]:
    - paragraph [ref=e58]: © 2026 PiBooru - Inspired by Danbooru
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
> 10 |     await expect(suggestion).toBeVisible({ timeout: 10000 });
     |                              ^ Error: expect(locator).toBeVisible() failed
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
  30 |     await page.locator('#edit-tags-button').click();
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