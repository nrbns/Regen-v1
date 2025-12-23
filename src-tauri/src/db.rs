// SQLite Database + FTS5 Full-Text Search
// Rust-owned offline storage

use rusqlite::{Connection, Result as SqliteResult, params};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageCache {
    pub id: String,
    pub url: String,
    pub title: String,
    pub content: String,
    pub html: Option<String>,
    pub cached_at: i64,          // Unix timestamp
    pub language: Option<String>, // Language code
}

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    // Initialize database and create schema
    pub fn new(db_path: Option<PathBuf>) -> SqliteResult<Self> {
        let path = db_path.unwrap_or_else(|| {
            // Default: use current directory
            // NOTE: In main.rs, this should be set to Tauri app data directory
            PathBuf::from("./regen.db")
        });

        // Create parent directory if it doesn't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(path)?;
        let db = Database { conn: Arc::new(Mutex::new(conn)) };
        db.init_schema()?;
        Ok(db)
    }

    // Initialize database schema
    fn init_schema(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        // Pages table (for page cache)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                html TEXT,
                cached_at INTEGER NOT NULL,
                language TEXT
            )",
            [],
        )?;

        // FTS5 virtual table for full-text search
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
                url,
                title,
                content,
                content_rowid='id',
                content='pages'
            )",
            [],
        )?;

        // History table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT NOT NULL,
                visited_at INTEGER NOT NULL,
                visit_count INTEGER DEFAULT 1
            )",
            [],
        )?;

        // Bookmarks table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                folder TEXT,
                tags TEXT,
                description TEXT
            )",
            [],
        )?;

        // Downloads table for persistence
        conn.execute(
            "CREATE TABLE IF NOT EXISTS downloads (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                filename TEXT,
                path TEXT,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0,
                received_bytes INTEGER DEFAULT 0,
                total_bytes INTEGER,
                created_at INTEGER NOT NULL,
                completed_at INTEGER,
                checksum TEXT,
                safety_status TEXT
            )",
            [],
        )?;

        // Notes table (for multilingual notes)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                language TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                tags TEXT
            )",
            [],
        )?;

        // Session storage table (for tab persistence)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY DEFAULT 'current',
                active_tab_id TEXT,
                tabs_json TEXT NOT NULL,
                saved_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create indexes for performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_history_url ON history(url)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_history_visited_at ON history(visited_at DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_language ON notes(language)",
            [],
        )?;

        Ok(())
    }

    // Save page to cache
    pub fn save_page(&self, page: &PageCache) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO pages (id, url, title, content, html, cached_at, language)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                page.id,
                page.url,
                page.title,
                page.content,
                page.html,
                page.cached_at,
                page.language
            ],
        )?;

        // Update FTS5 index
        conn.execute(
            "INSERT OR REPLACE INTO pages_fts (rowid, url, title, content)
             VALUES ((SELECT rowid FROM pages WHERE id = ?1), ?2, ?3, ?4)",
            params![page.id, page.url, page.title, page.content],
        )?;

        Ok(())
    }

    // Get page from cache
    pub fn get_page(&self, url: &str) -> SqliteResult<Option<PageCache>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, url, title, content, html, cached_at, language FROM pages WHERE url = ?1"
        )?;

        let page = stmt.query_row(params![url], |row| {
            Ok(PageCache {
                id: row.get(0)?,
                url: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                html: row.get(4)?,
                cached_at: row.get(5)?,
                language: row.get(6)?,
            })
        });

        match page {
            Ok(p) => Ok(Some(p)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    // Search pages using FTS5
    pub fn search_pages(&self, query: &str, limit: usize) -> SqliteResult<Vec<PageCache>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT p.id, p.url, p.title, p.content, p.html, p.cached_at, p.language
             FROM pages p
             JOIN pages_fts fts ON p.rowid = fts.rowid
             WHERE pages_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2"
        )?;

        let pages = stmt.query_map(params![query, limit as i64], |row| {
            Ok(PageCache {
                id: row.get(0)?,
                url: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                html: row.get(4)?,
                cached_at: row.get(5)?,
                language: row.get(6)?,
            })
        })?;

        let mut result = Vec::new();
        for page in pages {
            result.push(page?);
        }
        Ok(result)
    }

    // Delete page from cache
    pub fn delete_page(&self, url: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        // Delete from FTS5 (automatic via content='pages' option, but explicit is safer)
        conn.execute(
            "DELETE FROM pages_fts WHERE rowid IN (SELECT rowid FROM pages WHERE url = ?1)",
            params![url],
        )?;

        // Delete from pages table
        conn.execute("DELETE FROM pages WHERE url = ?1", params![url])?;

        Ok(())
    }

    // Add history entry
    pub fn add_history(&self, url: &str, title: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let visited_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Check if URL already exists in history
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM history WHERE url = ?1)",
            params![url],
            |row| row.get(0),
        )?;

        if exists {
            // Update existing entry
            conn.execute(
                "UPDATE history SET title = ?1, visited_at = ?2, visit_count = visit_count + 1 WHERE url = ?3",
                params![title, visited_at, url],
            )?;
        } else {
            // Insert new entry
            conn.execute(
                "INSERT INTO history (id, url, title, visited_at, visit_count) VALUES (?1, ?2, ?3, ?4, 1)",
                params![id, url, title, visited_at],
            )?;
        }

        Ok(())
    }

    // Get history (most recent first)
    pub fn get_history(&self, limit: usize) -> SqliteResult<Vec<(String, String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT url, title, visited_at FROM history ORDER BY visited_at DESC LIMIT ?1"
        )?;

        let entries = stmt.query_map(params![limit as i64], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }
        Ok(result)
    }

    // Clear history
    pub fn clear_history(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM history", [])?;
        Ok(())
    }

    // Search history
    pub fn search_history(&self, query: &str) -> SqliteResult<Vec<(String, String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT url, title, visited_at FROM history 
             WHERE url LIKE ?1 OR title LIKE ?1 
             ORDER BY visited_at DESC LIMIT 100"
        )?;

        let entries = stmt.query_map(params![search_pattern], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }
        Ok(result)
    }

    // Delete history entry by URL
    pub fn delete_history_url(&self, url: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM history WHERE url = ?1", params![url])?;
        Ok(())
    }

    // Save session state
    pub fn save_session(&self, active_tab_id: Option<&str>, tabs_json: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let saved_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT OR REPLACE INTO sessions (id, active_tab_id, tabs_json, saved_at) VALUES (?1, ?2, ?3, ?4)",
            params!["current", active_tab_id, tabs_json, saved_at],
        )?;
        Ok(())
    }

    // Load session state
    pub fn load_session(&self) -> SqliteResult<Option<(Option<String>, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT active_tab_id, tabs_json FROM sessions WHERE id = 'current'")?;

        match stmt.query_row([], |row| {
            Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?))
        }) {
            Ok(result) => Ok(Some(result)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    // ============================================================================
    // DOWNLOADS METHODS
    // ============================================================================

    // Add or update download
    pub fn save_download(&self, id: &str, url: &str, filename: Option<&str>, path: Option<&str>, 
                         status: &str, progress: f64, received_bytes: i64, total_bytes: Option<i64>,
                         checksum: Option<&str>, safety_status: Option<&str>) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        conn.execute(
            "INSERT OR REPLACE INTO downloads 
             (id, url, filename, path, status, progress, received_bytes, total_bytes, created_at, checksum, safety_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 
                     COALESCE((SELECT created_at FROM downloads WHERE id = ?1), ?9), ?10, ?11)",
            params![id, url, filename, path, status, progress, received_bytes, total_bytes, now, checksum, safety_status],
        )?;
        Ok(())
    }

    // Get all downloads
    pub fn get_downloads(&self, limit: Option<usize>) -> SqliteResult<Vec<(String, String, Option<String>, Option<String>, String, f64, i64, Option<i64>, i64, Option<i64>, Option<String>, Option<String>)>> {
        let conn = self.conn.lock().unwrap();
        let limit_val = limit.unwrap_or(100) as i64;
        let mut stmt = conn.prepare(
            "SELECT id, url, filename, path, status, progress, received_bytes, total_bytes, created_at, completed_at, checksum, safety_status 
             FROM downloads ORDER BY created_at DESC LIMIT ?1"
        )?;

        let entries = stmt.query_map(params![limit_val], |row| {
            Ok((
                row.get(0)?, // id
                row.get(1)?, // url
                row.get(2)?, // filename
                row.get(3)?, // path
                row.get(4)?, // status
                row.get(5)?, // progress
                row.get(6)?, // received_bytes
                row.get(7)?, // total_bytes
                row.get(8)?, // created_at
                row.get(9)?, // completed_at
                row.get(10)?, // checksum
                row.get(11)?, // safety_status
            ))
        })?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }
        Ok(result)
    }

    // Delete download
    pub fn delete_download(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM downloads WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ============================================================================
    // BOOKMARKS METHODS (for backend sync if needed)
    // ============================================================================

    // Add or update bookmark
    pub fn save_bookmark(&self, id: &str, url: &str, title: &str, folder: Option<&str>, 
                         tags: Option<&str>, description: Option<&str>) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        conn.execute(
            "INSERT OR REPLACE INTO bookmarks 
             (id, url, title, created_at, folder, tags, description)
             VALUES (?1, ?2, ?3, COALESCE((SELECT created_at FROM bookmarks WHERE id = ?1), ?4), ?5, ?6, ?7)",
            params![id, url, title, now, folder, tags, description],
        )?;
        Ok(())
    }

    // Get all bookmarks
    pub fn get_bookmarks(&self) -> SqliteResult<Vec<(String, String, String, i64, Option<String>, Option<String>, Option<String>)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, url, title, created_at, folder, tags, description FROM bookmarks ORDER BY created_at DESC"
        )?;

        let entries = stmt.query_map([], |row| {
            Ok((
                row.get(0)?, // id
                row.get(1)?, // url
                row.get(2)?, // title
                row.get(3)?, // created_at
                row.get(4)?, // folder
                row.get(5)?, // tags
                row.get(6)?, // description
            ))
        })?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }
        Ok(result)
    }

    // Delete bookmark
    pub fn delete_bookmark(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM bookmarks WHERE id = ?1", params![id])?;
        Ok(())
    }
}
