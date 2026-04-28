import type { PostRating } from "../db/schema";

export interface ParsedTag {
  name: string;
  namespace: string;
  negated: boolean;
}

export interface SearchQuery {
  tags: ParsedTag[];
  rating?: PostRating;
  limit?: number;
  order?: string;
  type?: 'video' | 'image';
  before_id?: number;
  after_id?: number;
}

export class SearchParser {
  /**
   * Parses a raw search string into a SearchQuery object.
   * Logic follows Danbooru-style syntax:
   * - "tag" : Include tag
   * - "-tag" : Exclude tag
   * - "namespace:tag" : Specific namespace
   * - "rating:s/q/e" : Filter by rating
   * - "type:video/image" : Filter by media type
   */
  static parse(input: string): SearchQuery {
    const tokens = input.split(/\s+/).filter(t => t.length > 0);
    const query: SearchQuery = {
      tags: []
    };

    for (const token of tokens) {
      if (token.includes(":")) {
        const parts = token.split(":");
        const key = parts[0].toLowerCase();
        const value = parts.slice(1).join(":");

        switch (key) {
          case "rating":
          case "r": {
            const r = value.toLowerCase()[0];
            if (["s", "q", "e"].includes(r)) {
              query.rating = r as PostRating;
            }
            break;
          }
          case "limit": {
            let l = parseInt(value, 10);
            if (!isNaN(l)) {
              // Cap limit at 1000 for robustness
              query.limit = Math.min(Math.max(1, l), 1000);
            }
            break;
          }
          case "type": {
            const t = value.toLowerCase();
            if (t === "video" || t === "image") {
              query.type = t;
            }
            break;
          }
          case "order": {
            query.order = value.toLowerCase();
            break;
          }
          case "id": {
            if (value.startsWith("<")) {
              const id = parseInt(value.substring(1), 10);
              if (!isNaN(id)) query.before_id = id;
            } else if (value.startsWith(">")) {
              const id = parseInt(value.substring(1), 10);
              if (!isNaN(id)) query.after_id = id;
            }
            break;
          }
          default: {
            // Namespaced tag (e.g., artist:picasso or -artist:picasso)
            let token = key + ":" + value;
            let negated = false;
            
            if (token.startsWith("-")) {
              negated = true;
              token = token.substring(1);
            }

            // Simple namespace resolution
            let namespace = "general";
            let name = token;

            if (token.includes(":") && !token.startsWith(":")) {
              const parts = token.split(":");
              const possibleNamespace = parts[0];
              const validNamespaces = ['artist', 'character', 'copyright', 'meta', 'general'];
              const aliases: Record<string, string> = {
                'art': 'artist',
                'char': 'character',
                'copy': 'copyright',
              };
              
              let namespaceToUse = possibleNamespace;
              if (aliases[possibleNamespace]) {
                namespaceToUse = aliases[possibleNamespace];
              }

              if (validNamespaces.includes(namespaceToUse)) {
                namespace = namespaceToUse;
                name = parts.slice(1).join(":");
              }
            }

            if (name.startsWith(":")) {
               name = name.substring(1);
            }

            query.tags.push({
              name: name.toLowerCase(),
              namespace,
              negated
            });
            break;
          }
        }
      } else {
        // Simple tag (potentially negated)
        let name = token.toLowerCase();
        let negated = false;

        if (name.startsWith("-")) {
          negated = true;
          name = name.substring(1);
        }

        query.tags.push({
          name,
          namespace: "general",
          negated
        });
      }
    }

    return query;
  }
}
