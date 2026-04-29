-- Fix tag uniqueness to allow the same name in different namespaces
-- SQLite doesn't support ALTER TABLE ... ADD CONSTRAINT, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE tags_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    namespace TEXT DEFAULT 'general',
    post_count INTEGER DEFAULT 0,
    UNIQUE(name, namespace)
);

-- Copy existing data
INSERT INTO tags_new (id, name, namespace, post_count)
SELECT id, name, namespace, post_count FROM tags;

-- Drop old table and rename new one
DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;

-- Recreate index
CREATE INDEX idx_tags_namespace ON tags(namespace);

PRAGMA foreign_keys = ON;
