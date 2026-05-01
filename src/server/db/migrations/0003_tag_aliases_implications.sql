-- Migration: 0003_tag_aliases_implications.sql

-- Table for Tag Aliases
-- Maps an alias (e.g., 'pup') to a target tag (e.g., 'dog')
CREATE TABLE IF NOT EXISTS tag_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias_name TEXT UNIQUE NOT NULL,
    target_tag_id INTEGER NOT NULL,
    FOREIGN KEY (target_tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Table for Tag Implications
-- Maps a source tag (e.g., 'dog') to a target tag (e.g., 'animal')
CREATE TABLE IF NOT EXISTS tag_implications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_tag_id INTEGER NOT NULL,
    target_tag_id INTEGER NOT NULL,
    UNIQUE(source_tag_id, target_tag_id),
    FOREIGN KEY (source_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (target_tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexing for performance
CREATE INDEX idx_tag_aliases_alias_name ON tag_aliases(alias_name);
CREATE INDEX idx_tag_implications_source_tag_id ON tag_implications(source_tag_id);
