# Project Overview: MyBooru

MyBooru is a lightweight, self-hosted Danbooru-style media board optimized for power users and resource-constrained environments (like Raspberry Pi). It features a robust tag-based organization system, support for images and video, and a highly efficient keyboard-driven interface (`hjkl`/`wasd`).

## Tech Stack
- **Runtime**: Bun
- **Web Framework**: Hono with JSX (SSR)
- **Frontend Interactivity**: HTMX (for dynamic partial updates)
- **Database**: SQLite (via `bun:sqlite`)
- **Media Processing**: FFmpeg (sole tool for images and video)
- **Client Logic**: TypeScript (compiled via Bun for keyboard management)

## Building and Running

### System Dependencies
- **FFmpeg**: Must be installed on the host system (`sudo apt install ffmpeg`).

### Installation
```bash
bun install
bun run build
```

### Development
```bash
# Start server with hot reload
bun run --hot src/index.ts

# Build client-side assets
bun build src/client/index.ts --outdir public/dist --minify
```

### Production
```bash
bun run src/index.ts
```

## Development Conventions

### Architecture & Style
- **Feature-Based Routing**: Group routes, components, and logic by domain (e.g., `posts`, `tags`, `upload`).
- **Async Components**: Use Hono's native support for `async` JSX components to fetch data directly within the view layer.
- **Validation**: Use **Zod** for all request validation and type safety.
- **Error Handling**: Use Hono's `app.onError` and Zod-based early rejection. HTMX requests should return error partials (toasts).
- **Skill**: Strictly follow the patterns defined in the `hono-jsx-patterns` skill.

### Media & Storage
- **FFmpeg Only**: Do not add extra image processing libraries like Sharp. Use FFmpeg for all thumbnailing and metadata extraction.
- **Sharded Storage**: Files are stored in the configured `DATA_DIR` under `original/` and `thumbs/` using a 2-level cryptographic sharding strategy based on SHA256 hashes (e.g., `.../a1/b2/[hash].[ext]`).
- **WebP**: All thumbnails must be generated as `.webp`.

### Frontend
- **HTMX First**: Prefer HTMX partial swaps over client-side state management.
- **Keyboard Manager**: Custom logic in `src/client` handles navigation and focus mapping.
- **Local Assets**: All libraries (HTMX, CSS) must be served locally to ensure private network (Tailscale) compatibility.

## Reference Documentation
For deep dives, see the `docs/` directory:
- `01-Product-Requirements-Document.md` (Scope & Shortcuts)
- `02-Architecture-and-Tech-Stack.md` (System Design)
- `03-Database-Schema.md` (SQL & Migrations)
- `04-Routes-and-API-Spec.md` (Hono/HTMX Endpoints)
- `05-UI-UX-and-Interactions.md` (Visuals & Keyboard Logic)
- `06-Security.md` (Zod, CSP, CSRF)
- `07-Configurability-and-Storage.md` (Env Vars & Sharding)
- `08-Version-Control-and-CI-CD.md` (Git, Actions, & Releases)

## General Rules
- Ensure to always use the hono-jsx-patterns skill when writing JSX code
