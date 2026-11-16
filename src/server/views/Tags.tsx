import type { FC } from 'hono/jsx';
import type { Tag } from '../db/schema';

const INPUT_STYLE = "width: 100%; background: #000; color: #fff; padding: 8px 12px; border: 1px solid #333; margin-bottom: 10px; border-radius: 4px; min-height: 44px; box-sizing: border-box; font-size: 14px;";
const SUBMIT_BTN_STYLE = "width: 100%; background: #2563eb; color: #fff; font-weight: bold; padding: 10px; border: none; cursor: pointer; border-radius: 4px; min-height: 44px; font-size: 14px;";
const TABLE_STYLE = "width: 100%; border-collapse: collapse; margin-top: 20px;";

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
              style={INPUT_STYLE}
            />
            <button 
              type="submit"
              style={SUBMIT_BTN_STYLE}
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

        <table class="tag-table" style={TABLE_STYLE}>
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
                  <a href={`/tag/${tag.name}`} class={`tag-type-${tag.namespace}`}>
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
