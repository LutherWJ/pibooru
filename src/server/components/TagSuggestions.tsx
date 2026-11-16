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
    <ul class="suggestions-list" style="list-style: none; padding: 0; margin: 0; border: 1px solid #444; border-top: none; user-select: none; -webkit-user-select: none;">
      {items.map((item, idx) => {
        return (
          <li 
            key={item.id ?? `item-${idx}`}
            class="suggestion-item"
            data-tag-value={item.value}
            style="display: flex; justify-content: space-between; align-items: center; min-height: 44px; padding: 10px 14px; cursor: pointer; background: #222; border-bottom: 1px solid #2d2d2d; touch-action: manipulation; box-sizing: border-box;"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class={item.isModifier ? "tag-type-meta" : `tag-type-${item.namespace || 'general'}`} style="font-weight: bold; font-size: 13px;">
                {item.name.replace(/_/g, ' ')}
              </span>
              <span style={`font-size: 10px; text-transform: uppercase; border-radius: 3px; padding: 2px 6px; ${item.isModifier ? 'color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 600;' : 'color: #888; background: #1a1a1a;'}`}>
                {item.namespace || (item.isModifier ? 'modifier' : 'tag')}
              </span>
            </div>
            <span style="font-size: 12px; color: #9ca3af; margin-left: auto;">
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
