import type { FC } from 'hono/jsx';
import type { Tag } from '../db/schema';

export interface SuggestionItem {
  id?: number | string;
  value: string;
  name: string;
  namespace?: string;
  post_count?: number;
  description?: string;
  isModifier?: boolean;
}

export interface TagSuggestionsProps {
  tags?: Tag[];
  suggestions?: SuggestionItem[];
}

/**
 * TagSuggestions Component
 * Refactored to match Danbooru-style suggestions with rich modifier & query keyword autocomplete.
 */
export const TagSuggestions: FC<TagSuggestionsProps> = ({ tags, suggestions }) => {
  const items: SuggestionItem[] = suggestions ?? (tags?.map(t => ({
    id: t.id,
    value: t.namespace === 'general' ? t.name : `${t.namespace}:${t.name}`,
    name: t.name,
    namespace: t.namespace,
    post_count: t.post_count,
    isModifier: false
  })) ?? []);

  if (items.length === 0) return null;

  return (
    <ul style="list-style: none; padding: 0; margin: 0; border: 1px solid #444; border-top: none;">
      {items.map((item, idx) => {
        return (
          <li 
            key={item.id ?? `item-${idx}`}
            class="suggestion-item"
            data-tag-value={item.value}
            style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; cursor: pointer; background: #222; border-bottom: 1px solid #2d2d2d;"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class={item.isModifier ? "tag-type-meta" : `tag-type-${item.namespace || 'general'}`} style="font-weight: bold;">
                {item.name.replace(/_/g, ' ')}
              </span>
              <span style={`font-size: 10px; text-transform: uppercase; border-radius: 3px; padding: 1px 4px; ${item.isModifier ? 'color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 600;' : 'color: #888; background: #1a1a1a;'}`}>
                {item.namespace || (item.isModifier ? 'modifier' : 'tag')}
              </span>
            </div>
            <span style="font-size: 11px; color: #9ca3af; margin-left: auto;">
              {item.isModifier ? (
                <span style="font-style: italic; color: #cbd5e1;">{item.description}</span>
              ) : (
                typeof item.post_count === 'number' ? item.post_count : ''
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
