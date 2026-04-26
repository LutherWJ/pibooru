# UI/UX and Interactions: MyBooru

## 1. Visual Design Language
- **Minimalist/Dark Mode**: High contrast, focus on media.
- **State Feedback**: Explicit visual indicators for "focused" thumbnails (e.g., a thick border or subtle glow).
- **Responsive**: Mobile-friendly grid, but optimized for desktop keyboard use.

## 2. Layouts

### 2.1 Index/Gallery
- **Header**: Sticky search bar (accessible via `q`).
- **Main**: CSS Grid of thumbnails.
- **Footer**: Pagination info (current page, total results).

### 2.2 Post Detail
- **Stage**: Large display area for the image or `<video>` player.
- **Sidebar**:
  - Metadata (Dimensions, Size, Date).
  - Tag List (grouped by namespace).
  - Quick-edit tag field (accessible via `e`).

## 3. Keyboard Interaction Logic

### 3.1 Focus Management
- A single "active" index is maintained in the client-side state.
- `hjkl` or `wasd` calculates the next index based on grid columns.
- The corresponding thumbnail element receives a `.is-active` class and is scrolled into view if necessary.

### 3.2 Action Mapping
| Key | Context | Action |
|---|---|---|
| `q` | Global | Focus search input; select all text. |
| `h/j/k/l` or `w/a/s/d` | Gallery | Move active focus (Left/Down/Up/Right). |
| `Space` or `Enter` | Gallery | Trigger click on active thumbnail (Navigates to Post Detail). |
| `z` / `x` | Gallery | Trigger HTMX request for Previous/Next page. |
| `Esc` | Any | Close modals, unfocus inputs, or return to Gallery from Post Detail. |
| `[` / `]` | Post Detail | Navigate to previous/next post in current result set. |
| `e` | Post Detail | Focus tag input field. |
| `f` | Post Detail | Trigger HTMX POST to `/api/post/:id/favorite`. |

## 4. HTMX Interaction Flows

### 4.1 Tag Editing
1. User presses `e` to focus the tag input.
2. User types a tag and presses `Enter`.
3. HTMX sends `PUT /api/post/:id/tags`.
4. Server responds with the updated `TagList` HTML.
5. HTMX swaps the old list with the new one.
6. A success toast or subtle animation provides feedback.

## 5. Implementation Notes
- **Event Interception**: Use `e.preventDefault()` on navigation keys to prevent native page scrolling while the user is browsing the grid.
- **Scroll Alignment**: The `KeyboardManager` must ensure the active thumbnail is always within the viewport using `element.scrollIntoView({ block: 'nearest' })`.
