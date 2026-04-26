# Database Schema: MyBooru

## 1. Overview
We use SQLite for its simplicity and performance in self-hosted environments. The schema is designed for fast tag filtering and is future-proofed for multi-user support and audio overlays.

## 2. Tables

### 2.1 `posts`
Stores core media metadata.
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `hash`: TEXT UNIQUE NOT NULL (MD5 or SHA256 for deduplication)
- `extension`: TEXT NOT NULL (e.g., 'jpg', 'mp4')
- `mime_type`: TEXT NOT NULL
- `size_bytes`: INTEGER NOT NULL
- `width`: INTEGER
- `height`: INTEGER
- `duration`: REAL (For video files)
- `rating`: TEXT DEFAULT 's' (s: safe, q: questionable, e: explicit)
- `source`: TEXT (Origin URL)
- `user_id`: INTEGER (Nullable, for future multi-user support)
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP

### 2.2 `tags`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `name`: TEXT UNIQUE NOT NULL
- `namespace`: TEXT DEFAULT 'general' (e.g., 'artist', 'character', 'meta')
- `post_count`: INTEGER DEFAULT 0 (Denormalized for performance)

### 2.3 `post_tags` (Many-to-Many)
- `post_id`: INTEGER NOT NULL
- `tag_id`: INTEGER NOT NULL
- PRIMARY KEY (`post_id`, `tag_id`)
- FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
- FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE

### 2.4 `users` (Future-Proofing)
Initially unused but included to establish relationships.
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `username`: TEXT UNIQUE NOT NULL
- `password_hash`: TEXT NOT NULL
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP

### 2.5 `audio_overlays` (Future-Proofing)
For the post-1.0 "song snippet" feature.
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `post_id`: INTEGER UNIQUE NOT NULL
- `file_path`: TEXT NOT NULL
- `start_ms`: INTEGER DEFAULT 0
- `duration_ms`: INTEGER
- FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE

## 3. Indexes for Performance
To ensure the "keyboard-driven" experience is snappy, we need specific indexes:
- `idx_posts_created_at`: `CREATE INDEX idx_posts_created_at ON posts(created_at DESC);`
- `idx_tags_namespace`: `CREATE INDEX idx_tags_namespace ON tags(namespace);`
- `idx_post_tags_tag_id`: (Already covered by composite PK, but useful for searching posts by tag).

## 4. Sample Query Logic
**Searching for `cat` AND `dog` BUT NOT `bird`:**
```sql
SELECT p.* FROM posts p
JOIN post_tags pt1 ON p.id = pt1.post_id
JOIN tags t1 ON pt1.tag_id = t1.id AND t1.name = 'cat'
JOIN post_tags pt2 ON p.id = pt2.post_id
JOIN tags t2 ON pt2.tag_id = t2.id AND t2.name = 'dog'
WHERE p.id NOT IN (
    SELECT pt3.post_id FROM post_tags pt3
    JOIN tags t3 ON pt3.tag_id = t3.id AND t3.name = 'bird'
)
ORDER BY p.created_at DESC
LIMIT 50;
```
*(Note: We will implement a more dynamic query builder in the service layer.)*
