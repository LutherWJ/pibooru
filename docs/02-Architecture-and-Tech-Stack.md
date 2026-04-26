# Architecture and Tech Stack: MyBooru

## 1. Core Stack
- **Runtime**: [Bun](https://bun.sh) (HTTP server, SQLite driver, and bundler).
- **Web Framework**: [Hono](https://hono.dev) with JSX (SSR).
- **Frontend Interactivity**: [HTMX](https://htmx.org) (Server-driven UI updates).
- **Database**: SQLite (via `bun:sqlite`).
- **Styling**: Vanilla CSS.
- **Media Processing**: **FFmpeg** (Sole tool for both Image and Video thumbnailing and metadata extraction).
- **Build System**: Bun's native bundler for compiling `src/client` (TypeScript) to `public/dist`.

## 2. System Components

### 2.1 Backend (Hono + Bun)
- **SSR-First**: Hono renders full-page layouts and initial state using JSX.
- **HTMX Endpoints**: Dedicated routes that return HTML fragments (partials) for dynamic updates like tag editing, search suggestions, and infinite scroll/pagination.
- **Media Service**: A wrapper around FFmpeg to generate thumbnails (`.webp`) and probe media for dimensions/duration.

### 2.2 Client-Side Build (`src/client` -> `public/dist`)
To support the keyboard-driven UX without a heavy SPA framework:
- **Source**: `src/client/**/*.ts`.
- **Logic**: Handles low-latency keyboard event interception, focus management, and custom HTMX triggers.
- **Build**: `bun build src/client/index.ts --outdir public/dist --minify`.

### 2.3 Media Pipeline (FFmpeg)
Consolidating on FFmpeg simplifies the environment:
- **Images**: `ffmpeg -i input.jpg -vf scale=300:-1 output.webp`.
- **Videos**: `ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -vf scale=300:-1 output.webp`.
- **Consistency**: All thumbnails are generated as WEBP for optimal web performance.

## 3. Keyboard Interaction Architecture
- **Keyboard Manager**: A singleton in `src/client` that listens for `keydown`.
- **Navigation**: Maps `hjkl`/`wasd` to moving a `data-active` attribute on post thumbnails.
- **Execution**: `Enter`/`Space` triggers a click on the active thumbnail; `q` focuses the search input via `document.querySelector().focus()`.

## 4. Directory Structure
```text
mybooru/
├── data/               # Persistent data (ignored by git)
│   ├── db.sqlite       
│   ├── original/       
│   └── thumbs/         
├── public/             # Static files and build output
│   ├── dist/           # Compiled client JS (from src/client)
│   └── css/            
├── src/
│   ├── client/         # TypeScript client-side logic (Build source)
│   ├── server/
│   │   ├── db/         # SQLite schemas and queries
│   │   ├── services/   # FFmpeg orchestration, file logic
│   │   ├── components/ # Hono JSX components
│   │   └── views/      # Full-page layouts
│   └── index.ts        # Server entry point
└── package.json
```
