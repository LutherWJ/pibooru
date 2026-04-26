# PRD: MyBooru

## 1. Project Overview
MyBooru is a lightweight, self-hosted Danbooru-style media board. It is built for high-efficiency media consumption and organization, featuring a power-user keyboard interface and support for images and video.

## 2. Target Audience
- Self-hosters who want a private media gallery.
- Power users who prefer keyboard navigation (`hjkl`/`wasd`) over mouse interaction.
- Collectors needing a robust, tag-based organization system.

## 3. Core Features (1.0)

### 3.1 Media Management
- **Formats**: Support for Images (JPG, PNG, WEBP, GIF) and Video (MP4, WebM).
- **Uploading**: Single/Batch upload with automatic thumbnail generation.
- **Tagging**: 
  - Namespaced tags: `artist:`, `character:`, `copyright:`, `general:`, `meta:`.
  - Suggestions/Autocomplete via HTMX-powered partials.
- **Metadata**: Source URLs, Ratings (Safe, Questionable, Explicit), and basic file info (dimensions, size).

### 3.2 Search & Discovery
- **Logic**: Tag-based search with boolean operators (e.g., `cat -dog`).
- **Performance**: Instant search results using SQLite indexes.

### 3.3 Keyboard-Driven UX (Revised)
- **Navigation (Grid)**:
  - `hjkl` or `wasd`: Move focus between thumbnails.
  - `Space` or `Enter`: Open selected post.
  - `z` / `x`: Previous / Next page.
  - `q`: Focus search bar.
- **Global**:
  - `u`: Go to upload page.
  - `h` or `?`: Show shortcut help overlay.
- **Post View**:
  - `e`: Focus tag editor.
  - `f`: Favorite/Like post.
  - `[` / `]`: Navigate to previous/next post in current search context.
  - `o`: Open original file in new tab.
  - `Esc`: Close view or return to grid.

## 4. Future Roadmap (Post 1.0)
The data model must be designed to accommodate these features without major breaking changes:
- **Audio Overlays**: Ability to attach song snippets/audio tracks to images (Instagram-style).
- **Multi-user Support**: `Users` table for individual favorites, uploads, and private galleries.
- **Pools/Collections**: Sequential grouping of posts.

## 5. Technical Constraints
- **Stack**: Bun, Hono (JSX), HTMX, SQLite.
- **Storage**: Media on local disk; Metadata in SQLite.
- **Extensibility**: Data model must include `user_id` and flexible `metadata` fields early to avoid costly migrations.
