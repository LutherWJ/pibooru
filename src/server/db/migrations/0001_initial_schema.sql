-- PiBooru Initial Schema

-- Posts
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    has_children BOOLEAN DEFAULT 0,
    hash TEXT UNIQUE NOT NULL,
    extension TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    duration REAL,
    rating TEXT DEFAULT 's',
    source TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON posts(parent_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    namespace TEXT DEFAULT 'general',
    post_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tags_namespace ON tags(namespace);

-- Post Tags (Junction)
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- Users (Future-proofing)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audio Overlays (Future-proofing)
CREATE TABLE IF NOT EXISTS audio_overlays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    start_ms INTEGER DEFAULT 0,
    duration_ms INTEGER,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
