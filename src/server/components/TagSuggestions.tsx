import type { FC } from 'hono/jsx';
import type { Tag } from '../db/schema';

interface TagSuggestionsProps {
  tags: Tag[];
}

/**
 * TagSuggestions Component
 * Refactored to match Danbooru-style suggestions.
 */
export const TagSuggestions: FC<TagSuggestionsProps> = ({ tags }) => {
  if (tags.length === 0) return null;

  return (
    <ul style="list-style: none; padding: 0; margin: 0; border: 1px solid #444; border-top: none;">
      {tags.map((tag) => {
        const tagValue = tag.namespace === 'general' ? tag.name : `${tag.namespace}:${tag.name}`;
        return (
          <li 
            key={tag.id}
            class="suggestion-item"
            data-tag-value={tagValue}
            style="display: flex; justify-between; align-items: center; padding: 5px 10px; cursor: pointer; background: #222;"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class={`tag-type-${tag.namespace}`} style="font-weight: bold;">
                {tag.name.replace(/_/g, ' ')}
              </span>
              <span style="font-size: 10px; color: #666; text-transform: uppercase;">
                {tag.namespace}
              </span>
            </div>
            <span style="font-size: 11px; color: #888; margin-left: auto;">
              {tag.post_count}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
