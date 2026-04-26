import type { FC } from 'hono/jsx';
import type { Tag } from '../db/schema';

interface TagsProps {
  tags: Tag[];
  query: string;
  page: number;
  totalCount: number;
  limit: number;
}

/**
 * Tags Page View
 * Displays a detailed table of tags with search and pagination.
 */
export const Tags: FC<TagsProps> = ({ tags, query, page, totalCount, limit }) => {
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <aside id="sidebar">
        <section class="sidebar-box">
          <h2>Tag Search</h2>
          <form action="/tags" method="get">
            <input 
              type="text" 
              name="q" 
              value={query} 
              placeholder="Search tags..."
              style="width: 100%; background: #000; color: #fff; padding: 5px; border: 1px solid #333; margin-bottom: 10px;"
            />
            <button 
              type="submit"
              style="width: 100%; background: #3b82f6; color: #fff; font-weight: bold; padding: 5px; border: none; cursor: pointer;"
            >
              Search
            </button>
          </form>
        </section>

        <section class="sidebar-box">
          <h2>Help</h2>
          <p style="font-size: 11px; color: #888;">
            Showing {tags.length} of {totalCount} tags.
          </p>
        </section>
      </aside>

      <section id="content">
        <h1>Tags</h1>

        <table class="tag-table" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #333; text-align: left;">
              <th style="padding: 10px;">Name</th>
              <th style="padding: 10px;">Namespace</th>
              <th style="padding: 10px; text-align: right;">Count</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr style="border-bottom: 1px solid #222;">
                <td style="padding: 10px;">
                  <a href={`/?tags=${encodeURIComponent(tag.namespace === 'general' ? tag.name : `${tag.namespace}:${tag.name}`)}`} class={`tag-type-${tag.namespace}`}>
                    {tag.name.replace(/_/g, ' ')}
                  </a>
                </td>
                <td style="padding: 10px; color: #666; font-size: 11px; text-transform: uppercase;">
                  {tag.namespace}
                </td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">
                  {tag.post_count}
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colspan={3} style="padding: 20px; text-align: center; color: #666;">
                  No tags found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div id="paginator" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
            {page > 1 && (
              <a href={`/tags?q=${encodeURIComponent(query)}&page=${page - 1}`} class="page-link">« Previous</a>
            )}
            <span style="color: #666;">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <a href={`/tags?q=${encodeURIComponent(query)}&page=${page + 1}`} class="page-link">Next »</a>
            )}
          </div>
        )}
      </section>
    </>
  );
};
