# Configurability and Storage: MyBooru

## 1. Configuration Management
MyBooru uses environment variables for configuration, with sensible defaults for local development.

### 1.1 Environment Variables (`.env`)
- `PORT`: Port the server binds to (Default: `3000`).
- `HOST`: Host interface (Default: `127.0.0.1`).
- `DATA_DIR`: Root directory for database and media (Default: `./data`).
- `FFMPEG_PATH`: Path to the FFmpeg binary (Default: `ffmpeg` in PATH).
- `THUMB_SIZE`: Maximum width/height for thumbnails (Default: `300`).

## 2. Storage Strategy

### 2.1 Directory Sharding
To maintain performance on systems with many files, we use a two-level cryptographic sharding strategy based on the file's hash (SHA256).

**Example Hash**: `a1b2c3d4e5f6...`
- **Original Path**: `data/original/a1/b2/a1b2c3d4e5f6...jpg`
- **Thumbnail Path**: `data/thumbs/a1/b2/a1b2c3d4e5f6...webp`

**Benefits**:
- **Performance**: Limits the number of files in a single directory, preventing filesystem slowdowns.
- **Reliability**: Simplifies backup and synchronization tasks by distributing the load.
- **Security**: Makes it harder to guess file paths or accidentally list large directories.

### 2.2 File Life Cycle
1.  **Upload**: File is saved to a `temp/` directory.
2.  **Hashing**: SHA256 is calculated.
3.  **Validation**: FFmpeg probes the file to confirm MIME type and metadata.
4.  **Move**: File is moved to its sharded path in `original/`.
5.  **Thumbnail**: FFmpeg generates a `.webp` thumbnail in the sharded `thumbs/` path.
6.  **Cleanup**: Temporary files are deleted immediately.

## 3. Database Storage
- The SQLite database resides at `data/db.sqlite`.
- Periodic `VACUUM` and `ANALYZE` tasks should be considered for long-term performance as the tag database grows.

## 4. Portability
The entire `data/` directory is portable. Moving this directory to a new machine and pointing the `DATA_DIR` environment variable to it should result in a fully functional migration.
