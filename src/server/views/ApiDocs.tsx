import type { FC } from 'hono/jsx';

/**
 * ApiDocs View
 * Dedicated documentation page for the non-HTMX REST API and scripting interface.
 */
export const ApiDocs: FC = () => {
  return (
    <>
      <aside id="sidebar">
        <section class="sidebar-box">
          <h2>API Reference</h2>
          <ul class="tag-list" style="font-size: 12px; line-height: 1.8;">
            <li><a href="#overview">Overview</a></li>
            <li><a href="#auth">Authentication</a></li>
            <li><a href="#endpoint-upload">POST /upload</a></li>
            <li><a href="#endpoint-rating">POST /post/:id/rating</a></li>
            <li><a href="#endpoint-tags">POST /post/:id/tags</a></li>
            <li><a href="#endpoint-delete">DELETE /post/:id</a></li>
            <li><a href="#endpoint-search">GET / (Search & Listing)</a></li>
            <li><a href="#endpoint-media">Media & Thumbnails</a></li>
            <li><a href="#code-examples">Code Examples</a></li>
          </ul>
        </section>

        <section class="sidebar-box">
          <h2>Navigation</h2>
          <ul class="tag-list" style="font-size: 12px; line-height: 1.8;">
            <li><a href="/wiki_pages" class="tag-type-meta">Search Query Guide</a></li>
            <li><a href="/settings" class="tag-type-character">Get API Key (Settings)</a></li>
            <li><a href="/upload" class="tag-type-general">Web Uploader</a></li>
          </ul>
        </section>
      </aside>

      <section id="content">
        <h1 style="border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 20px;">
          REST API & Scripting Guide
        </h1>

        <div style="line-height: 1.6; color: #ccc;">
          <p>
            MyBooru provides a lightweight, script-friendly REST interface alongside its HTMX web UI.
            External scripts, bulk uploaders, and automated scrapers can interact with all core endpoints
            using standard HTTP methods and API token authentication.
          </p>

          {/* Section: Overview */}
          <div id="overview" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              1. Overview
            </h2>
            <ul style="padding-left: 20px;">
              <li><strong>Base URL:</strong> The root URL of your instance (e.g. <code>http://localhost:3001</code> or <code>https://booru.yourdomain.com</code>).</li>
              <li><strong>Formats:</strong> Accepts <code>multipart/form-data</code> and <code>application/x-www-form-urlencoded</code>. Set <code>Accept: application/json</code> for JSON responses.</li>
              <li><strong>Rate Limits:</strong> Global rate limiter allows up to 10,000 requests per 15-minute window per IP.</li>
              <li><strong>Concurrency:</strong> For low-resource environments (e.g. Raspberry Pi), 3 to 5 concurrent upload requests is recommended.</li>
            </ul>
          </div>

          {/* Section: Authentication */}
          <div id="auth" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              2. Authentication
            </h2>
            <p>
              Scripts should authenticate using a <strong>Bearer API Key</strong> in the HTTP <code>Authorization</code> header.
              You can generate or rotate your key anytime from the <a href="/settings" style="color: #38bdf8; font-weight: bold;">Settings</a> page.
            </p>
            <div style="background: #1e1e1e; padding: 12px; border-radius: 4px; border: 1px solid #333; font-family: monospace; font-size: 13px; color: #93c5fd; overflow-x: auto;">
              Authorization: Bearer YOUR_API_KEY_HERE
            </div>
            <p style="margin-top: 10px; font-size: 13px; color: #94a3b8;">
              <em>Note:</em> Requests presenting a valid <code>Authorization: Bearer</code> header automatically bypass CSRF protection checks.
              Alternatively, scripts running inside a browser session can use the standard <code>session_id</code> cookie.
            </p>
          </div>

          {/* Section: Endpoints */}
          <div id="endpoints" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              3. API Endpoints
            </h2>

            {/* Endpoint: Upload */}
            <div id="endpoint-upload" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px; margin-top: 15px;">
              <h3 style="margin-top: 0; color: #4ade80;">
                <span style="background: #166534; color: #86efac; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px;">POST</span>
                /upload
              </h3>
              <p>Uploads a media file (image or video), strips container metadata, extracts dimensions, generates a WebP thumbnail, and saves tags.</p>

              <h4 style="color: #93c5fd; margin-bottom: 4px;">Headers</h4>
              <ul style="font-size: 13px; margin-top: 0;">
                <li><code>Authorization: Bearer &lt;API_KEY&gt;</code></li>
                <li><code>Accept: application/json</code> (instructs server to return JSON rather than redirect)</li>
              </ul>

              <h4 style="color: #93c5fd; margin-bottom: 4px;">Body (multipart/form-data)</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px;">
                <thead>
                  <tr style="border-bottom: 1px solid #444; text-align: left;">
                    <th style="padding: 6px;">Field</th>
                    <th style="padding: 6px;">Type</th>
                    <th style="padding: 6px;">Required</th>
                    <th style="padding: 6px;">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 6px;"><code>file</code></td>
                    <td style="padding: 6px;">Binary File</td>
                    <td style="padding: 6px;">Yes</td>
                    <td style="padding: 6px;">Image (JPG, PNG, WebP, GIF) or Video (MP4, WebM).</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 6px;"><code>tags</code></td>
                    <td style="padding: 6px;">String</td>
                    <td style="padding: 6px;">No</td>
                    <td style="padding: 6px;">Space-delimited tags (e.g. <code>landscape mountain artist:monet</code>).</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 6px;"><code>rating</code></td>
                    <td style="padding: 6px;">String</td>
                    <td style="padding: 6px;">No</td>
                    <td style="padding: 6px;"><code>s</code> (Safe, default), <code>q</code> (Questionable), or <code>e</code> (Explicit).</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 6px;"><code>source</code></td>
                    <td style="padding: 6px;">String</td>
                    <td style="padding: 6px;">No</td>
                    <td style="padding: 6px;">Source URL or origin reference string.</td>
                  </tr>
                </tbody>
              </table>

              <h4 style="color: #93c5fd; margin-bottom: 4px; margin-top: 12px;">JSON Responses</h4>
              <div style="background: #111; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #86efac;">
                {"// Success (New Post Created)\n"}
                {`{\n  "success": true,\n  "postId": 142,\n  "redirectUrl": "/post/142"\n}\n\n`}
                {"// Deduplication (File Already Existed in Library)\n"}
                {`{\n  "success": true,\n  "postId": 89,\n  "redirectUrl": "/post/89",\n  "alreadyExists": true\n}`}
              </div>
            </div>

            {/* Endpoint: Rating */}
            <div id="endpoint-rating" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px; margin-top: 15px;">
              <h3 style="margin-top: 0; color: #38bdf8;">
                <span style="background: #0369a1; color: #bae6fd; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px;">POST</span>
                /post/:id/rating
              </h3>
              <p>Updates the maturity rating of an existing post.</p>

              <h4 style="color: #93c5fd; margin-bottom: 4px;">Body (application/x-www-form-urlencoded)</h4>
              <ul style="font-size: 13px; margin-top: 0;">
                <li><code>rating</code>: <code>s</code> (Safe), <code>q</code> (Questionable), or <code>e</code> (Explicit).</li>
              </ul>
              <div style="background: #111; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #93c5fd;">
                curl -X POST http://localhost:3001/post/142/rating \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
                &nbsp;&nbsp;-d "rating=e"
              </div>
            </div>

            {/* Endpoint: Tags */}
            <div id="endpoint-tags" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px; margin-top: 15px;">
              <h3 style="margin-top: 0; color: #38bdf8;">
                <span style="background: #0369a1; color: #bae6fd; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px;">POST</span>
                /post/:id/tags
              </h3>
              <p>Replaces all tags on a post. Automatically adjusts tag usage counts, resolves aliases, and expands implications.</p>

              <h4 style="color: #93c5fd; margin-bottom: 4px;">Body (application/x-www-form-urlencoded)</h4>
              <ul style="font-size: 13px; margin-top: 0;">
                <li><code>tags</code>: Space-separated tag list (e.g. <code>scenery night_sky artist:monet</code>).</li>
              </ul>
            </div>

            {/* Endpoint: Delete */}
            <div id="endpoint-delete" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px; margin-top: 15px;">
              <h3 style="margin-top: 0; color: #f87171;">
                <span style="background: #991b1b; color: #fecaca; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px;">DELETE</span>
                /post/:id
              </h3>
              <p>Permanently deletes a post, its database record, tag associations, and physical files from storage.</p>
              <div style="background: #111; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #fca5a5;">
                curl -X DELETE http://localhost:3001/post/142 \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"
              </div>
            </div>

            {/* Endpoint: Search */}
            <div id="endpoint-search" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px; margin-top: 15px;">
              <h3 style="margin-top: 0; color: #fbbf24;">
                <span style="background: #854d0e; color: #fef08a; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px;">GET</span>
                /?tags=...&page=...
              </h3>
              <p>Queries the post library using Danbooru search syntax.</p>
              <p style="font-size: 13px;">
                Each post thumbnail in the HTML response contains <code>data-post-id="ID"</code>, allowing client scripts to extract IDs via regex:
              </p>
              <div style="background: #111; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #fde047;">
                const postIds = [...html.matchAll(/data-post-id="(\d+)"/g)].map(m =&gt; parseInt(m[1], 10));
              </div>
            </div>

            {/* Endpoint: Media */}
            <div id="endpoint-media" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px; margin-top: 15px;">
              <h3 style="margin-top: 0; color: #a78bfa;">
                <span style="background: #5b21b6; color: #ddd6fe; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px;">GET</span>
                Static Media & Thumbnails
              </h3>
              <ul style="font-size: 13px;">
                <li><strong>Original Files:</strong> <code>/data/original/&lt;h1&gt;/&lt;h2&gt;/&lt;hash&gt;.&lt;ext&gt;</code></li>
                <li><strong>WebP Thumbnails:</strong> <code>/data/thumbs/&lt;h1&gt;/&lt;h2&gt;/&lt;hash&gt;.webp</code></li>
              </ul>
            </div>
          </div>

          {/* Section: Code Examples */}
          <div id="code-examples" style="margin-top: 35px; margin-bottom: 40px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              4. Code Examples
            </h2>

            {/* Python Example */}
            <h3 style="color: #93c5fd; margin-top: 20px;">Python (Upload a file)</h3>
            <pre style="background: #111; padding: 14px; border-radius: 6px; border: 1px solid #333; font-family: monospace; font-size: 13px; color: #e2e8f0; overflow-x: auto;">
{`import requests

url = "http://localhost:3001/upload"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Accept": "application/json"
}

with open("wallpaper.png", "rb") as f:
    files = {"file": f}
    data = {
        "tags": "scenery landscape night_sky artist:unknown",
        "rating": "s",
        "source": "https://example.com/art"
    }
    response = requests.post(url, headers=headers, files=files, data=data)
    result = response.json()
    print("Post ID:", result.get("postId"))`}
            </pre>

            {/* Bun/JavaScript Example */}
            <h3 style="color: #93c5fd; margin-top: 25px;">JavaScript / Bun (Fetch non-explicit posts and update)</h3>
            <pre style="background: #111; padding: 14px; border-radius: 6px; border: 1px solid #333; font-family: monospace; font-size: 13px; color: #e2e8f0; overflow-x: auto;">
{`const baseUrl = "http://localhost:3001";
const apiKey = "YOUR_API_KEY";

// 1. Fetch Safe posts
const res = await fetch(\`\${baseUrl}/?tags=rating:s\`, {
  headers: { "Authorization": \`Bearer \${apiKey}\` }
});
const html = await res.text();
const postIds = [...html.matchAll(/data-post-id="(\\d+)"/g)].map(m => parseInt(m[1], 10));

// 2. Update post rating to explicit
for (const id of postIds) {
  await fetch(\`\${baseUrl}/post/\${id}/rating\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${apiKey}\`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "rating=e"
  });
  console.log(\`Updated post \${id} to explicit\`);
}`}
            </pre>
          </div>
        </div>
      </section>
    </>
  );
};
