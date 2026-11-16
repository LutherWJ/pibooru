import type { FC } from 'hono/jsx';
import type { Post, Tag } from '../db/schema';

const BACK_BTN_STYLE = "width: 100%; text-align: center; display: inline-flex; align-items: center; justify-content: center; min-height: 44px; font-weight: bold; font-size: 14px;";
const EDIT_FORM_STYLE = "display: none; position: relative;";
const TAGS_TEXTAREA_STYLE = "width: 100%; background: #000; color: #fff; border: 1px solid #333; min-height: 120px; font-size: 14px; padding: 10px; border-radius: 4px; box-sizing: border-box;";
const SUGGESTIONS_POPUP_STYLE = "position: absolute; width: 100%; background: #222; z-index: 100; max-height: 250px; overflow-y: auto;";
const SAVE_BTN_STYLE = "background: #2563eb; color: #fff; border: none; padding: 12px; width: 100%; margin-top: 8px; cursor: pointer; border-radius: 4px; font-weight: bold; min-height: 44px; font-size: 14px;";
const CANCEL_BTN_STYLE = "background: #444; color: #fff; border: none; padding: 10px; width: 100%; margin-top: 6px; cursor: pointer; border-radius: 4px; min-height: 44px; font-size: 14px;";
const MEDIA_STYLE = "max-width: 100%; max-height: 85vh; border-radius: 4px; cursor: zoom-in;";

interface PostDetailProps {
  post: Post;
  tags: Tag[];
  prevPostId?: number | null;
  nextPostId?: number | null;
  searchQuery?: string;
}

/**
 * Post Detail View
 * Responsive Danbooru layout with mobile hero media, in-app fullscreen lightbox,
 * touch-friendly tag chips, and adjacent post navigation.
 */
export const PostDetail: FC<PostDetailProps> = ({ 
  post, 
  tags, 
  prevPostId, 
  nextPostId, 
  searchQuery 
}) => {
  const isVideo = post.mime_type.startsWith('video/');
  const originalUrl = `/data/original/${post.hash.slice(0, 2)}/${post.hash.slice(2, 4)}/${post.hash}${post.extension}`;
  
  const queryParam = searchQuery ? `?tags=${encodeURIComponent(searchQuery)}` : '';
  const prevUrl = prevPostId ? `/post/${prevPostId}${queryParam}` : null;
  const nextUrl = nextPostId ? `/post/${nextPostId}${queryParam}` : null;

  // Group tags by namespace
  const namespaces = ['artist', 'copyright', 'character', 'general', 'meta'];
  const groupedTags = namespaces.map(ns => ({
    name: ns,
    items: tags.filter(t => t.namespace === ns)
  })).filter(g => g.items.length > 0);

  return (
    <>
      {/* Adjacent Navigation Links for keyboard manager & search engines */}
      {prevUrl && <a href={prevUrl} id="post-prev-link" rel="prev" style="display:none;" aria-hidden="true">Prev</a>}
      {nextUrl && <a href={nextUrl} id="post-next-link" rel="next" style="display:none;" aria-hidden="true">Next</a>}

      <aside id="sidebar">
        <div style="margin-bottom: 12px;" class="desktop-only-back">
          <a href={searchQuery ? `/?tags=${encodeURIComponent(searchQuery)}` : "/"} id="back-to-search" class="button" style={BACK_BTN_STYLE} hx-disable="true">« Back to Gallery</a>
        </div>

        {/* Post Quick Nav Bar (Prev / Next buttons) */}
        {(prevUrl || nextUrl) && (
          <div class="post-nav-bar sidebar-box">
            <h2>Navigation</h2>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              {prevUrl ? (
                <a href={prevUrl} class="button" style="flex: 1; text-align: center; min-height: 40px; display: flex; align-items: center; justify-content: center; font-size: 13px;">‹ Prev Post</a>
              ) : (
                <span class="button" style="flex: 1; text-align: center; min-height: 40px; display: flex; align-items: center; justify-content: center; opacity: 0.4; font-size: 13px;">‹ Prev</span>
              )}
              {nextUrl ? (
                <a href={nextUrl} class="button" style="flex: 1; text-align: center; min-height: 40px; display: flex; align-items: center; justify-content: center; font-size: 13px;">Next Post ›</a>
              ) : (
                <span class="button" style="flex: 1; text-align: center; min-height: 40px; display: flex; align-items: center; justify-content: center; opacity: 0.4; font-size: 13px;">Next ›</span>
              )}
            </div>
          </div>
        )}

        <section id="tag-list" class="sidebar-box">
          <h2>Tags</h2>
          <div class="tag-list-wrapper">
            <ul class="tag-list">
              {groupedTags.map(group => (
                <>
                  {group.items.map(tag => (
                    <li key={tag.id} class={`tag-type-${tag.namespace} tag-chip-item`}>
                      <a href={`/?tags=${encodeURIComponent(tag.name)}`} class="tag-symbol">?</a>{' '}
                      <a href={`/?tags=${encodeURIComponent(tag.name)}`} class="tag-name">{tag.name.replace(/_/g, ' ')}</a>{' '}
                      <span class="post-count">{tag.post_count}</span>
                    </li>
                  ))}
                </>
              ))}
            </ul>
          </div>
        </section>

        <section id="post-information" class="sidebar-box">
          <h2>Information</h2>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; line-height: 1.8;">
            <li><strong>ID:</strong> {post.id}</li>
            <li><strong>Date:</strong> {new Date(post.created_at).toLocaleDateString()}</li>
            <li id="rating-container" style="display: flex; align-items: center; gap: 8px;">
              <strong>Rating:</strong>
              <form action={`/post/${post.id}/rating`} method="post" style="display: inline-flex; align-items: center; margin: 0;">
                <select 
                  name="rating" 
                  class="rating-select"
                  hx-post={`/post/${post.id}/rating`} 
                  hx-target="#rating-container" 
                  hx-swap="outerHTML"
                  hx-trigger="change"
                  style="background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 4px 8px; font-size: 13px; cursor: pointer; min-height: 32px;"
                  title="Change content rating"
                >
                  <option value="s" selected={post.rating === 's'}>Safe (General)</option>
                  <option value="q" selected={post.rating === 'q'}>Questionable</option>
                  <option value="e" selected={post.rating === 'e'}>Explicit</option>
                </select>
              </form>
            </li>
            <li><strong>Size:</strong> {(post.size_bytes / 1024 / 1024).toFixed(2)} MB</li>
            {post.width && (
              <li><strong>Dimensions:</strong> {post.width} x {post.height}</li>
            )}
            {post.source && (
              <li style="word-break: break-all;"><strong>Source:</strong> <a href={post.source} target="_blank" rel="noopener">{post.source}</a></li>
            )}
          </ul>
        </section>

        <section id="options" class="sidebar-box">
          <h2>Options</h2>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 2;">
            <li>
              <a href="#" id="open-lightbox-btn" class="option-btn">
                🔍 Fullscreen Lightbox
              </a>
            </li>
            <li>
              <a href={originalUrl} download={`post-${post.id}${post.extension}`} class="option-btn">
                💾 Download original file
              </a>
            </li>
            <li>
              <a href="#" id="edit-tags-link" data-toggle-visibility="#edit-tags-form" class="option-btn">
                ✏️ Edit tags
              </a>
            </li>
            <li>
              <a 
                href="#" 
                class="text-red option-btn"
                hx-delete={`/post/${post.id}`}
                hx-confirm="Are you sure you want to delete this post?"
                hx-indicator="this"
                hx-disabled-elt="this"
              >
                🗑️ Delete post
              </a>
            </li>
          </ul>
        </section>

        <section id="edit-tags-form" class="sidebar-box" style={EDIT_FORM_STYLE}>
          <h2>Edit Tags</h2>
          <form action={`/post/${post.id}/tags`} method="post" hx-replace-url="true">
            <textarea 
              name="tags" 
              style={TAGS_TEXTAREA_STYLE}
              hx-get="/partials/tags/suggestions"
              hx-trigger="input changed delay:100ms, keyup changed delay:100ms"
              hx-target="#edit-suggestions-container"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck={false}
            >
              {tags.map(t => (t.namespace === 'general' ? t.name : `${t.namespace}:${t.name}`)).join(' ')}
            </textarea>
            <div id="edit-suggestions-container" style={SUGGESTIONS_POPUP_STYLE}></div>
            <button type="submit" style={SAVE_BTN_STYLE}>Save Tags</button>
            <button type="button" id="edit-tags-cancel" data-toggle-visibility="#edit-tags-form" style={CANCEL_BTN_STYLE}>Cancel</button>
          </form>
        </section>
      </aside>

      <section id="content">
        <div id="image-container" class="image-stage">
          {isVideo ? (
            <video 
              id="post-media-element"
              src={originalUrl} 
              controls 
              autoplay
              loop
              playsinline
              style={MEDIA_STYLE}
            />
          ) : (
            <img 
              id="post-media-element"
              src={originalUrl} 
              alt={`Post ${post.id}`}
              style={MEDIA_STYLE}
              title="Click or tap to view fullscreen"
            />
          )}

          {/* Fullscreen Hint / Overlay Button for Mobile Touch */}
          <button 
            type="button" 
            id="mobile-fullscreen-trigger" 
            class="mobile-fs-btn" 
            aria-label="View Fullscreen"
          >
            ⛶ Expand
          </button>
        </div>
      </section>

      {/* In-App Fullscreen Lightbox Modal */}
      <div id="lightbox-modal" class="lightbox-overlay" style="display: none;" tabIndex={-1} data-hx-history="false">
        <header class="lightbox-header">
          <button type="button" id="lightbox-close-btn" class="lightbox-close" aria-label="Close fullscreen">✕</button>
          <span class="lightbox-title">Post #{post.id}</span>
          <a href={originalUrl} download={`post-${post.id}${post.extension}`} class="lightbox-btn" title="Download Original">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
        </header>

        <div class="lightbox-content" id="lightbox-content-area">
          {isVideo ? (
            <video 
              src={originalUrl} 
              controls 
              autoplay 
              loop 
              playsinline 
              class="lightbox-media"
            />
          ) : (
            <img 
              src={originalUrl} 
              alt={`Post ${post.id}`} 
              class="lightbox-media"
            />
          )}
        </div>

        {prevUrl && (
          <a href={prevUrl} class="lightbox-nav lightbox-prev" rel="prev" aria-label="Previous post">‹</a>
        )}
        {nextUrl && (
          <a href={nextUrl} class="lightbox-nav lightbox-next" rel="next" aria-label="Next post">›</a>
        )}
      </div>
    </>
  );
};
