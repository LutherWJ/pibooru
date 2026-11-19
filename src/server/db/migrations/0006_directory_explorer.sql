-- Virtual Directories
CREATE TABLE IF NOT EXISTS directories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES directories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_directories_parent_id ON directories(parent_id);

-- Insert Canonical Root Directory
INSERT OR IGNORE INTO directories (id, parent_id, name) VALUES (1, NULL, 'Root');

-- Virtual Directory Items (Symbolic Media Links)
CREATE TABLE IF NOT EXISTS directory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    directory_id INTEGER NOT NULL DEFAULT 1,
    post_id INTEGER NOT NULL,
    custom_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (directory_id) REFERENCES directories(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(directory_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_directory_items_directory_id ON directory_items(directory_id);
CREATE INDEX IF NOT EXISTS idx_directory_items_post_id ON directory_items(post_id);

-- Seed existing posts into Root directory
INSERT OR IGNORE INTO directory_items (directory_id, post_id, custom_name)
SELECT 1, id, hash || extension FROM posts;
