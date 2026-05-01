import type { FC } from 'hono/jsx';
import type { Post, Tag } from '../db/schema';
import { PostThumbnail } from '../components/PostThumbnail';

interface TagDetailProps {
  tag: Tag;
  aliases: string[];
  implications: Tag[];
  posts: Post[];
}

/**
 * Tag Detail View
 * Shows information about a tag, its aliases, implications, and recent posts.
 */
export const TagDetail: FC<TagDetailProps> = ({ tag, aliases, implications, posts }) => {
  return (
    <>
      <aside id="sidebar">
        <section class="sidebar-box">
          <h2>Tag Info</h2>
          <div style="font-size: 13px;">
            <p><strong>Name:</strong> {tag.name}</p>
            <p><strong>Namespace:</strong> <span class={`tag-type-${tag.namespace}`}>{tag.namespace}</span></p>
            <p><strong>Post Count:</strong> {tag.post_count}</p>
          </div>
        </section>

        <section class="sidebar-box">
          <h2>Actions</h2>
          <ul style="list-style: none; padding: 0; font-size: 13px;">
            <li><a href={`/?tags=${encodeURIComponent(tag.name)}`}>View Posts</a></li>
            <li><a href="/tags">Back to Tags</a></li>
          </ul>
        </section>
      </aside>

      <section id="content">
        <h1>Tag: {tag.name.replace(/_/g, ' ')}</h1>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          {/* Aliases Section */}
          <section class="admin-box" style="background: #111; padding: 15px; border: 1px solid #333;">
            <h3>Aliases</h3>
            <p style="font-size: 11px; color: #888; margin-bottom: 10px;">
              Aliases map other terms to this tag. (e.g., "pup" → "dog")
            </p>
            
            <ul id="alias-list" style="margin-bottom: 15px;">
              {aliases.map(alias => (
                <li style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>{alias}</span>
                  <button 
                    hx-delete={`/api/tags/${tag.name}/alias/${alias}`}
                    hx-target="closest li"
                    hx-swap="outerHTML"
                    style="background: #ef4444; color: white; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px;"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {aliases.length === 0 && <li style="color: #666; font-style: italic;">No aliases.</li>}
            </ul>

            <form hx-post={`/api/tags/${tag.name}/alias`} hx-target="#alias-list" hx-swap="beforeend">
              <input 
                type="text" 
                name="alias" 
                placeholder="New alias..." 
                required
                style="background: #000; color: #fff; border: 1px solid #444; padding: 5px; width: 120px;"
              />
              <button type="submit" style="background: #3b82f6; color: #fff; border: none; padding: 5px 10px; cursor: pointer;">Add</button>
            </form>
          </section>

          {/* Implications Section */}
          <section class="admin-box" style="background: #111; padding: 15px; border: 1px solid #333;">
            <h3>Implications</h3>
            <p style="font-size: 11px; color: #888; margin-bottom: 10px;">
              When this tag is added, these tags are also added. (e.g., "dog" → "animal")
            </p>

            <ul id="implication-list" style="margin-bottom: 15px;">
              {implications.map(targetTag => (
                <li style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <a href={`/tag/${targetTag.name}`} class={`tag-type-${targetTag.namespace}`}>{targetTag.name}</a>
                  <button 
                    hx-delete={`/api/tags/${tag.name}/implication/${targetTag.id}`}
                    hx-target="closest li"
                    hx-swap="outerHTML"
                    style="background: #ef4444; color: white; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px;"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {implications.length === 0 && <li style="color: #666; font-style: italic;">No implications.</li>}
            </ul>

            <form hx-post={`/api/tags/${tag.name}/implication`} hx-target="#implication-list" hx-swap="beforeend">
              <input 
                type="text" 
                name="target_tag" 
                placeholder="Implies tag..." 
                required
                style="background: #000; color: #fff; border: 1px solid #444; padding: 5px; width: 120px;"
              />
              <button type="submit" style="background: #3b82f6; color: #fff; border: none; padding: 5px 10px; cursor: pointer;">Add</button>
            </form>
          </section>
        </div>

        <h2 style="margin-top: 30px;">Recent Posts</h2>
        <div id="post-grid" class="posts-container" style="margin-top: 10px;">
          {posts.map((post) => (
            <PostThumbnail key={post.id} post={post} />
          ))}
          {posts.length === 0 && <p style="color: #666;">No posts tagged with this yet.</p>}
        </div>
      </section>
    </>
  );
};
