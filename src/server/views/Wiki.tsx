import type { FC } from 'hono/jsx';

/**
 * Wiki / Search Syntax & Query Guide View
 * In-depth documentation for search operators, query modifiers, namespaces, and keyboard controls.
 */
export const Wiki: FC = () => {
  return (
    <>
      <aside id="sidebar">
        <section class="sidebar-box">
          <h2>Query Syntax</h2>
          <ul class="tag-list" style="font-size: 12px; line-height: 1.8;">
            <li><a href="#overview">Overview</a></li>
            <li><a href="#basic-tags">Basic Tag Matching</a></li>
            <li><a href="#negation">Tag Negation (-)</a></li>
            <li><a href="#namespaces">Namespaces (artist, char...)</a></li>
            <li><a href="#order">Sorting (order:)</a></li>
            <li><a href="#ratings">Content Ratings (rating:)</a></li>
            <li><a href="#media-type">Media Types (type:)</a></li>
            <li><a href="#limits-ranges">Limits & IDs (limit:, id:)</a></li>
            <li><a href="#keybinds">Keyboard Shortcuts</a></li>
          </ul>
        </section>

        <section class="sidebar-box">
          <h2>Quick Searches</h2>
          <ul class="tag-list" style="font-size: 12px; line-height: 1.8;">
            <li><a href="/?tags=order:random" class="tag-type-meta">Random Shuffle</a></li>
            <li><a href="/?tags=type:video" class="tag-type-meta">Videos Only</a></li>
            <li><a href="/?tags=rating:s" class="tag-type-meta">Safe Media</a></li>
            <li><a href="/?tags=rating:e" class="tag-type-meta">Explicit Media</a></li>
            <li><a href="/clean" class="tag-type-character">Launch Clean Mode</a></li>
          </ul>
        </section>
      </aside>

      <section id="content">
        <h1 style="border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 20px;">
          Search Syntax & Query Engine Guide
        </h1>

        <div style="line-height: 1.6; color: #ccc;">
          <p>
            PiBooru uses a fast, Danbooru-style tag query parser. You can combine descriptive tags, 
            namespace qualifiers, content rating gates, sort orders, and media filters in a single search query.
          </p>

          {/* Section: Overview */}
          <div id="overview" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              1. Overview & General Rules
            </h2>
            <ul style="padding-left: 20px;">
              <li><strong>Whitespace Delimited:</strong> Multiple terms are separated by spaces (e.g. <code>tag1 tag2</code>).</li>
              <li><strong>Implicit AND:</strong> All specified tags must be present on a post for it to match.</li>
              <li><strong>Case Insensitive:</strong> <code>Order:Random</code> is identical to <code>order:random</code>.</li>
              <li><strong>Multi-word Tags:</strong> Words in tag names are joined by underscores (e.g. <code>blue_sky</code>, <code>solo_focus</code>).</li>
              <li><strong>Live Autocomplete:</strong> Press <kbd>Tab</kbd> or <kbd>↓</kbd> in any search bar to navigate suggestions, and <kbd>Enter</kbd> to insert.</li>
            </ul>
          </div>

          {/* Section: Basic Tag Matching */}
          <div id="basic-tags" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              2. Basic Tag Matching
            </h2>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Query</th>
                  <th style="padding: 8px;">Description</th>
                  <th style="padding: 8px;">Example</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>cat</code></td>
                  <td style="padding: 8px;">Posts containing the tag <code>cat</code>.</td>
                  <td style="padding: 8px;"><a href="/?tags=cat">/?tags=cat</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>cat blue_eyes</code></td>
                  <td style="padding: 8px;">Posts containing BOTH <code>cat</code> and <code>blue_eyes</code>.</td>
                  <td style="padding: 8px;"><a href="/?tags=cat+blue_eyes">/?tags=cat+blue_eyes</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Negation */}
          <div id="negation" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              3. Negation & Exclusions (-)
            </h2>
            <p>
              Prepend a hyphen/minus sign (<code>-</code>) to any tag or query modifier to exclude posts that have it.
            </p>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Query</th>
                  <th style="padding: 8px;">Description</th>
                  <th style="padding: 8px;">Example</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>-dog</code></td>
                  <td style="padding: 8px;">Exclude posts tagged with <code>dog</code>.</td>
                  <td style="padding: 8px;"><a href="/?tags=-dog">/?tags=-dog</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>cat -dog</code></td>
                  <td style="padding: 8px;">Posts tagged with <code>cat</code>, but NOT <code>dog</code>.</td>
                  <td style="padding: 8px;"><a href="/?tags=cat+-dog">/?tags=cat+-dog</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>-rating:e</code></td>
                  <td style="padding: 8px;">Exclude all explicit posts.</td>
                  <td style="padding: 8px;"><a href="/?tags=-rating:e">/?tags=-rating:e</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>-type:video</code></td>
                  <td style="padding: 8px;">Exclude all videos (images only).</td>
                  <td style="padding: 8px;"><a href="/?tags=-type:video">/?tags=-type:video</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Namespaces */}
          <div id="namespaces" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              4. Namespaces
            </h2>
            <p>
              Tags are categorized into namespaces for clarity and color-coded rendering. You can target specific namespaces using <code>namespace:name</code>.
            </p>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Namespace</th>
                  <th style="padding: 8px;">Alias</th>
                  <th style="padding: 8px;">Description</th>
                  <th style="padding: 8px;">Syntax Example</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><span class="tag-type-artist" style="font-weight: bold;">artist</span></td>
                  <td style="padding: 8px;"><code>art:</code></td>
                  <td style="padding: 8px;">Creator, illustrator, animator, or photographer.</td>
                  <td style="padding: 8px;"><code>artist:picasso</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><span class="tag-type-character" style="font-weight: bold;">character</span></td>
                  <td style="padding: 8px;"><code>char:</code></td>
                  <td style="padding: 8px;">Character or person depicted in the media.</td>
                  <td style="padding: 8px;"><code>character:hatsune_miku</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><span class="tag-type-copyright" style="font-weight: bold;">copyright</span></td>
                  <td style="padding: 8px;"><code>copy:</code></td>
                  <td style="padding: 8px;">Originating franchise, anime, movie, or game.</td>
                  <td style="padding: 8px;"><code>copyright:vocaloid</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><span class="tag-type-meta" style="font-weight: bold;">meta</span></td>
                  <td style="padding: 8px;">—</td>
                  <td style="padding: 8px;">Metadata attributes (e.g. resolution, scan type).</td>
                  <td style="padding: 8px;"><code>meta:highres</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><span class="tag-type-general" style="font-weight: bold;">general</span></td>
                  <td style="padding: 8px;">—</td>
                  <td style="padding: 8px;">Standard descriptive tags (default when no prefix).</td>
                  <td style="padding: 8px;"><code>scenery</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Sort Orders */}
          <div id="order" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              5. Sort Orders (order:)
            </h2>
            <p>
              Control result ordering using <code>order:keyword</code>. Autocomplete shows options immediately when typing <code>order:</code>.
            </p>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Modifier</th>
                  <th style="padding: 8px;">Behavior</th>
                  <th style="padding: 8px;">Action Link</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>order:random</code></td>
                  <td style="padding: 8px;">Randomizes media order on every load. Ideal for discovery & Clean mode slideshow.</td>
                  <td style="padding: 8px;"><a href="/?tags=order:random">Try Random</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>order:newest</code></td>
                  <td style="padding: 8px;">Default order. Posts sorted chronologically by upload timestamp (newest first).</td>
                  <td style="padding: 8px;"><a href="/?tags=order:newest">Try Newest</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>order:oldest</code></td>
                  <td style="padding: 8px;">Posts sorted by upload timestamp starting from the earliest post.</td>
                  <td style="padding: 8px;"><a href="/?tags=order:oldest">Try Oldest</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>order:id_desc</code></td>
                  <td style="padding: 8px;">Sorted strictly by post ID descending (highest post ID first).</td>
                  <td style="padding: 8px;"><a href="/?tags=order:id_desc">Try ID Desc</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>order:id_asc</code></td>
                  <td style="padding: 8px;">Sorted strictly by post ID ascending (lowest post ID first).</td>
                  <td style="padding: 8px;"><a href="/?tags=order:id_asc">Try ID Asc</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Content Ratings */}
          <div id="ratings" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              6. Content Ratings (rating: or r:)
            </h2>
            <p>
              Filter content by age/maturity suitability. You can use <code>rating:</code> or the shorthand <code>r:</code>.
            </p>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Rating</th>
                  <th style="padding: 8px;">Shorthand</th>
                  <th style="padding: 8px;">Description</th>
                  <th style="padding: 8px;">Action Link</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>rating:s</code></td>
                  <td style="padding: 8px;"><code>r:s</code></td>
                  <td style="padding: 8px;"><strong>Safe</strong> — General audience, suitable for work/public.</td>
                  <td style="padding: 8px;"><a href="/?tags=rating:s">Filter Safe</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>rating:q</code></td>
                  <td style="padding: 8px;"><code>r:q</code></td>
                  <td style="padding: 8px;"><strong>Questionable</strong> — Sensitive, suggestive, or borderline content.</td>
                  <td style="padding: 8px;"><a href="/?tags=rating:q">Filter Questionable</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>rating:e</code></td>
                  <td style="padding: 8px;"><code>r:e</code></td>
                  <td style="padding: 8px;"><strong>Explicit</strong> — Mature/adult material.</td>
                  <td style="padding: 8px;"><a href="/?tags=rating:e">Filter Explicit</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Media Types */}
          <div id="media-type" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              7. Media Type Filtering (type:)
            </h2>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Modifier</th>
                  <th style="padding: 8px;">Matching Formats</th>
                  <th style="padding: 8px;">Action Link</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>type:image</code></td>
                  <td style="padding: 8px;">Still images: JPG, JPEG, PNG, WebP, GIF.</td>
                  <td style="padding: 8px;"><a href="/?tags=type:image">Images Only</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>type:video</code></td>
                  <td style="padding: 8px;">Animated/video media: MP4, WebM.</td>
                  <td style="padding: 8px;"><a href="/?tags=type:video">Videos Only</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Limits and Ranges */}
          <div id="limits-ranges" style="margin-top: 30px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              8. Limits & Cursor Ranges (limit:, id:)
            </h2>
            <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #444; text-align: left;">
                  <th style="padding: 8px;">Modifier</th>
                  <th style="padding: 8px;">Description</th>
                  <th style="padding: 8px;">Example</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>limit:50</code></td>
                  <td style="padding: 8px;">Set the page size (max 1000).</td>
                  <td style="padding: 8px;"><a href="/?tags=limit:20">/?tags=limit:20</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>id:&lt;500</code></td>
                  <td style="padding: 8px;">Posts with ID less than 500 (older posts).</td>
                  <td style="padding: 8px;"><code>id:&lt;500</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 8px;"><code>id:&gt;500</code></td>
                  <td style="padding: 8px;">Posts with ID greater than 500 (newer posts).</td>
                  <td style="padding: 8px;"><code>id:&gt;500</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Keyboard Shortcuts */}
          <div id="keybinds" style="margin-top: 30px; margin-bottom: 40px;">
            <h2 style="color: #38bdf8; border-bottom: 1px solid #333; padding-bottom: 4px;">
              9. Keyboard Navigation Cheat Sheet
            </h2>
            <p>
              PiBooru is fully keyboard-driven, engineered for high-throughput curation with <code>hjkl</code> or <code>wasd</code>.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 15px;">
              {/* Clean Mode Card */}
              <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px;">
                <h3 style="color: #93c5fd; margin-top: 0; display: flex; justify-content: space-between;">
                  Clean Mode (/clean)
                  <a href="/clean" style="font-size: 11px; font-weight: normal; color: #38bdf8;">Launch →</a>
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; line-height: 2;">
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">D</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Space</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">→</kbd> — Keep & Advance to Next</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">S</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">X</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Del</kbd> — <span style="color: #f87171; font-weight: bold;">Delete & Advance to Next</span></li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">A</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Q</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">←</kbd> — Previous Post</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">/</kbd> — Focus & Select Tag Filter input</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Esc</kbd> — Blur search input / Return to Gallery</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">?</kbd> — Show shortcuts help</li>
                </ul>
              </div>

              {/* Gallery Listing Card */}
              <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 16px;">
                <h3 style="color: #93c5fd; margin-top: 0;">Gallery & Thumbnail Grid</h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; line-height: 2;">
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">H</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">J</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">K</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">L</kbd> — Directional Focus</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">W</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">A</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">S</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">D</kbd> — WASD Focus</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Enter</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Space</kbd> — Open highlighted post</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Z</kbd> / <kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">X</kbd> — Previous / Next Page</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">Q</kbd> — Focus Search Box</li>
                  <li><kbd style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px;">U</kbd> — Navigate to Upload</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
