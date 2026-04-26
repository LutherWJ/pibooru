import type { FC } from 'hono/jsx';
import type { Post, Tag } from '../db/schema';

interface PostDetailProps {
  post: Post;
  tags: Tag[];
}

/**
 * Post Detail View
 * Refactored to match Danbooru's post detail layout.
 */
export const PostDetail: FC<PostDetailProps> = ({ post, tags }) => {
  const isVideo = post.mime_type.startsWith('video/');
  const originalUrl = `/data/original/${post.hash.slice(0, 2)}/${post.hash.slice(2, 4)}/${post.hash}${post.extension}`;
  
  // Group tags by namespace
  const namespaces = ['artist', 'copyright', 'character', 'general', 'meta'];
  const groupedTags = namespaces.map(ns => ({
    name: ns,
    items: tags.filter(t => t.namespace === ns)
  })).filter(g => g.items.length > 0);

  return (
    <>
      <aside id="sidebar">
        <section id="tag-list" class="sidebar-box">
          <h2>Tags</h2>
          <ul class="tag-list">
            {groupedTags.map(group => (
              <>
                {group.items.map(tag => (
                  <li key={tag.id} class={`tag-type-${tag.namespace}`}>
                    <a href={`/?tags=${tag.name}`}>?</a>{' '}
                    <a href={`/?tags=${tag.name}`} class="tag-name">{tag.name.replace(/_/g, ' ')}</a>{' '}
                    <span class="post-count">{tag.post_count}</span>
                  </li>
                ))}
              </>
            ))}
          </ul>
        </section>

        <section id="post-information" class="sidebar-box">
          <h2>Information</h2>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 11px;">
            <li><strong>ID:</strong> {post.id}</li>
            <li><strong>Date:</strong> {new Date(post.created_at).toLocaleDateString()}</li>
            <li><strong>Rating:</strong> <span class="uppercase">{post.rating}</span></li>
            <li><strong>Size:</strong> {(post.size_bytes / 1024 / 1024).toFixed(2)} MB</li>
            {post.width && (
              <li><strong>Dimensions:</strong> {post.width} x {post.height}</li>
            )}
            {post.source && (
              <li style="word-break: break-all;"><strong>Source:</strong> <a href={post.source} target="_blank">{post.source}</a></li>
            )}
          </ul>
        </section>

        <section id="options" class="sidebar-box">
          <h2>Options</h2>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 11px;">
            <li><a href={originalUrl} target="_blank">View original file</a></li>
            <li>
              <a href="#" id="edit-tags-link" data-toggle-visibility="#edit-tags-form">Edit tags</a>
            </li>
            <li>
              <a 
                href="#" 
                class="text-red"
                hx-delete={`/post/${post.id}`}
                hx-confirm="Are you sure you want to delete this post?"
              >
                Delete post
              </a>
            </li>
            <li><a href="#">Favorite</a></li>
          </ul>
        </section>

        <section id="edit-tags-form" class="sidebar-box" style="display: none; position: relative;">
          <h2>Edit Tags</h2>
          <form action={`/post/${post.id}/tags`} method="post">
            <textarea 
              name="tags" 
              style="width: 100%; background: #000; color: #fff; border: 1px solid #333; height: 100px; font-size: 11px;"
              hx-get="/partials/tags/suggestions"
              hx-trigger="keyup changed delay:100ms"
              hx-target="#edit-suggestions-container"
            >
              {tags.map(t => (t.namespace === 'general' ? t.name : `${t.namespace}:${t.name}`)).join(' ')}
            </textarea>
            <div id="edit-suggestions-container" style="position: absolute; width: 100%; background: #222; z-index: 10;"></div>
            <button type="submit" style="background: #3b82f6; color: #fff; border: none; padding: 5px; width: 100%; margin-top: 5px; cursor: pointer;">Save</button>
            <button type="button" id="edit-tags-cancel" data-toggle-visibility="#edit-tags-form" style="background: #444; color: #fff; border: none; padding: 5px; width: 100%; margin-top: 5px; cursor: pointer;">Cancel</button>
          </form>
        </section>
      </aside>

      <section id="content">
        <div id="image-container">
          {isVideo ? (
            <video 
              src={originalUrl} 
              controls 
              autoplay
              loop
              style="max-width: 100%; max-height: 85vh;"
            />
          ) : (
            <img 
              src={originalUrl} 
              alt={`Post ${post.id}`}
              style="max-width: 100%; max-height: 85vh;"
            />
          )}
        </div>
      </section>
    </>
  );
};
