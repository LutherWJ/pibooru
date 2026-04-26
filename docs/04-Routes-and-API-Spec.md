# Routes and API Spec: MyBooru

## 1. Overview
Hono will handle three types of requests:
1.  **Full-Page Routes**: Return complete HTML documents (SSR).
2.  **HTMX Partials**: Return HTML fragments for dynamic updates.
3.  **Action Endpoints**: Handle form submissions and data mutations, typically redirecting or returning HTMX triggers.

## 2. Full-Page Routes (SSR)

### `GET /`
- **Description**: The main gallery/index page.
- **Query Params**:
  - `tags`: Search query (string).
  - `page`: Page number (default 1).
- **Behavior**: Renders the search bar and the initial `PostGrid`.

### `GET /post/:id`
- **Description**: Detailed view of a single post.
- **Behavior**: Renders the image/video player, metadata sidebar, and tag editor.

### `GET /upload`
- **Description**: The upload form.
- **Behavior**: Simple form for file selection and initial tagging.

## 3. HTMX Partials (`/partials/*`)

### `GET /partials/post-grid`
- **Query Params**: Same as `GET /`.
- **Description**: Returns only the `<div>` containing thumbnails.
- **Usage**: Used for pagination (`z`/`x` keys) and search filtering without a full reload.

### `GET /partials/tags/suggestions`
- **Query Params**: `q` (current input string).
- **Description**: Returns a list of `<li>` or `<div>` elements for the autocomplete dropdown.

### `GET /partials/post/:id/tags`
- **Description**: Returns the tag list for a specific post.
- **Usage**: Used to refresh the tag sidebar after an update.

## 4. Action Endpoints (POST/PUT/DELETE)

### `POST /api/upload`
- **Body**: `multipart/form-data` (files, tags, rating).
- **Behavior**: Processes media via FFmpeg, saves to DB, and redirects to the new post or gallery.

### `PUT /api/post/:id/tags`
- **Body**: `tags` (string or array).
- **Behavior**: Updates the association in `post_tags`.
- **Response**: Returns the updated `TagList` partial with an `HX-Trigger` header to notify other UI components if needed.

### `POST /api/post/:id/favorite`
- **Behavior**: Toggles favorite status.
- **Response**: Returns a partial of the favorite button (filled/unfilled).

## 5. Validation Rules
- **Tags**: Must be lowercase, alphanumeric, with support for specific namespaces (`artist:`, etc.).
- **Media**: Restricted to specific MIME types (image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm).
- **Ratings**: Must be one of `s`, `q`, `e`.

## 6. Future-Proofing (API)
- **Audio Overlays**: `PUT /api/post/:id/audio` will accept an audio file and timestamp metadata.
- **User Auth**: All routes will eventually be wrapped in a middleware that checks for a session cookie/JWT.
