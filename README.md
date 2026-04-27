# MyBooru

A lightweight, self-hosted Danbooru-style media board.

## Prerequisites

- **Bun**: [Installation Guide](https://bun.sh)
- **FFmpeg**: Required for thumbnail generation and metadata extraction.

### Installing FFmpeg

**Ubuntu/Debian/Raspberry Pi OS:**
```bash
sudo apt update && sudo apt install -y ffmpeg
```

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

## Installation

```bash
# Clone the repository
git clone https://github.com/LutherWJ/pibooru.git
cd pibooru

# Install JS dependencies
bun install

# Build frontend assets
bun run build
```

## Running the Server

```bash
# Start the server
bun run src/server/index.tsx
```

## Bulk Uploading

Use the included script to upload entire directories:

```bash
bun scripts/bulk_upload.ts --dir /path/to/media --tags "tag1 tag2" --username admin --password pass --url http://localhost:3000
```
