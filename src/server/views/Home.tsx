import type { FC } from 'hono/jsx';
import type { Post } from '../db/schema';
import { PostThumbnail } from '../components/PostThumbnail';

interface HomeProps {
  posts: Post[];
  searchQuery?: string;
  currentPage?: string;
  totalCount: number;
  limit: number;
}

/**
 * Home Page View
 * Refactored to Danbooru's sidebar + content layout.
 */
export const Home: FC<HomeProps> = ({ posts, searchQuery, currentPage = "1", totalCount, limit }) => {
  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("tags", searchQuery);

  const getPageUrl = (p: string | number) => {
    const params = new URLSearchParams(queryParams);
    params.set("page", p.toString());
    return `/?${params.toString()}`;
  };

  const firstPost = posts[0];
  const lastPost = posts[posts.length - 1];
  
  // Current page number (if numeric)
  const isNumericPage = /^\d+$/.test(currentPage);
  const pageNum = isNumericPage ? parseInt(currentPage, 10) : 1;
  const totalPages = Math.ceil(totalCount / limit);

  // Determine if we should show Prev/Next
  // If we have an after_id (page starts with 'a'), we are definitely not on the first page of results
  // If we have a before_id (page starts with 'b'), we are definitely not on the last page of results
  // For numeric pages, it's easier.
  const hasPrev = isNumericPage ? pageNum > 1 : currentPage.startsWith('a') || currentPage.startsWith('b');
  const hasNext = isNumericPage ? pageNum < totalPages : posts.length === limit;

  // Generate page numbers to show (up to 7, centered around current)
  const pagesToShow: number[] = [];
  let startPage = Math.max(1, pageNum - 3);
  let endPage = Math.min(totalPages, startPage + 6);
  if (endPage - startPage < 6) {
    startPage = Math.max(1, endPage - 6);
  }
  for (let i = startPage; i <= endPage; i++) {
    pagesToShow.push(i);
  }

  return (
    <>
      <aside id="sidebar">
        <section id="search-box" class="sidebar-box">
          <h2>Search</h2>
          <form action="/" method="get">
            <input 
              type="text" 
              name="tags" 
              placeholder="Tags"
              value={searchQuery || ""}
              id="tags"
              autofocus
              autocomplete="off"
              hx-get="/partials/tags/suggestions"
              hx-trigger="keyup changed delay:100ms"
              hx-target="#suggestions-container"
            />
            <div id="suggestions-container"></div>
            <button type="submit" style="display:none">Go</button>
          </form>
        </section>

        <section id="tag-box" class="sidebar-box">
          <h2>Tags</h2>
          <ul class="tag-list">
            <li class="italic text-slate-500">Search for tags to see them here.</li>
          </ul>
        </section>
      </aside>

      <section id="content">
        <div 
          id="post-grid"
          class="posts-container"
          tabindex={0}
        >
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <PostThumbnail key={post.id} post={post} active={index === 0} />
            ))
          ) : (
            <div style="padding: 20px; border: 2px dashed #333; text-align: center;">
              <p>No posts found.</p>
              <a href="/upload" style="font-weight: bold;">Upload something?</a>
            </div>
          )}
        </div>

        {totalCount > limit && (
          <div id="paginator">
            <menu>
              {hasPrev && firstPost && (
                <li><a href={getPageUrl(`a${firstPost.id}`)} rel="prev">« Previous</a></li>
              )}
              
              {pagesToShow.map(p => (
                <li key={p} class={pageNum === p ? "current-page" : ""}>
                  <a href={getPageUrl(p)}>{p}</a>
                </li>
              ))}

              {endPage < totalPages && (
                <li><span>...</span></li>
              )}

              {hasNext && lastPost && (
                <li><a href={getPageUrl(`b${lastPost.id}`)} rel="next">Next »</a></li>
              )}
            </menu>
          </div>
        )}
      </section>
    </>
  );
};
