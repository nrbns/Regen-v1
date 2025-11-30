// SQLite Database for Local-First Storage
// Handles sessions, notes, agent cache

use rusqlite::{Connection, Result, params};
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub user_id: Option<String>,
    pub data: String, // JSON string
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Note {
    pub id: String,
    pub session_id: Option<String>,
    pub content: String,
    pub metadata: String, // JSON string
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct AgentCache {
    pub id: String,
    pub url: String,
    pub summary: String,
    pub cached_at: String,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let app_data_dir = app.path()
            .app_data_dir()
            .map_err(|e| rusqlite::Error::InvalidPath(format!("{:?}", e).into()))?;
        
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| rusqlite::Error::InvalidPath(e.to_string().into()))?;
        
        let db_path = app_data_dir.join("regen_sessions.db");
        let conn = Connection::open(db_path)?;
        
        let db = Database { conn };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                user_id TEXT,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS agent_cache (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                summary TEXT NOT NULL,
                cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create indexes
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_session_id ON notes(session_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_agent_cache_url ON agent_cache(url)",
            [],
        )?;

        Ok(())
    }

    // Session operations
    #[allow(dead_code)]
    pub fn save_session(&self, session: &Session) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO sessions (id, title, user_id, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![session.id, session.title, session.user_id, session.data, session.created_at],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_session(&self, id: &str) -> Result<Option<Session>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, user_id, data, created_at FROM sessions WHERE id = ?1"
        )?;
        
        let session_result = stmt.query_row(params![id], |row| {
            Ok(Session {
                id: row.get(0)?,
                title: row.get(1)?,
                user_id: get_optional(row, 2)?,
                data: row.get(3)?,
                created_at: row.get(4)?,
            })
        });
        
        match session_result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    #[allow(dead_code)]
    pub fn list_sessions(&self, user_id: Option<&str>) -> Result<Vec<Session>> {
        let mut sessions = Vec::new();
        
        if let Some(uid) = user_id {
            let mut stmt = self.conn.prepare(
                "SELECT id, title, user_id, data, created_at FROM sessions WHERE user_id = ?1 ORDER BY created_at DESC"
            )?;
            let rows = stmt.query_map(params![uid], |row| {
                Ok(Session {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    user_id: row.get(2)?,
                    data: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?;
            for row in rows {
                sessions.push(row?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT id, title, user_id, data, created_at FROM sessions ORDER BY created_at DESC"
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Session {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    user_id: row.get(2)?,
                    data: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?;
            for row in rows {
                sessions.push(row?);
            }
        }
        
        Ok(sessions)
    }

    #[allow(dead_code)]
    pub fn delete_session(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    // Note operations
    #[allow(dead_code)]
    pub fn save_note(&self, note: &Note) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO notes (id, session_id, content, metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![note.id, note.session_id, note.content, note.metadata, note.created_at],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_note(&self, id: &str) -> Result<Option<Note>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, content, metadata, created_at FROM notes WHERE id = ?1"
        )?;
        
        let note_result = stmt.query_row(params![id], |row| {
            Ok(Note {
                id: row.get(0)?,
                session_id: get_optional(row, 1)?,
                    content: row.get(2)?,
                    metadata: get_optional(row, 3)?.unwrap_or_default(),
                created_at: row.get(4)?,
            })
        });
        
        match note_result {
            Ok(note) => Ok(Some(note)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    #[allow(dead_code)]
    pub fn list_notes(&self, session_id: Option<&str>) -> Result<Vec<Note>> {
        let mut notes = Vec::new();
        
        if let Some(sid) = session_id {
            let mut stmt = self.conn.prepare(
                "SELECT id, session_id, content, metadata, created_at FROM notes WHERE session_id = ?1 ORDER BY created_at DESC"
            )?;
            let rows = stmt.query_map(params![sid], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    session_id: get_optional(row, 1)?,
                    content: row.get(2)?,
                    metadata: get_optional(row, 3)?.unwrap_or_default(),
                    created_at: row.get(4)?,
                })
            })?;
            for row in rows {
                notes.push(row?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT id, session_id, content, metadata, created_at FROM notes ORDER BY created_at DESC"
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    session_id: get_optional(row, 1)?,
                    content: row.get(2)?,
                    metadata: get_optional(row, 3)?.unwrap_or_default(),
                    created_at: row.get(4)?,
                })
            })?;
            for row in rows {
                notes.push(row?);
            }
        }
        
        Ok(notes)
    }

    #[allow(dead_code)]
    pub fn delete_note(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        Ok(())
    }

    // Agent cache operations
    pub fn get_cached_summary(&self, url: &str) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT summary FROM agent_cache WHERE url = ?1 ORDER BY cached_at DESC LIMIT 1"
        )?;
        
        let summary_result = stmt.query_row(params![url], |row| {
            Ok(row.get::<_, String>(0)?)
        });
        
        match summary_result {
            Ok(summary) => Ok(Some(summary)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn cache_summary(&self, url: &str, summary: &str) -> Result<()> {
        // Generate ID from URL hash for better uniqueness
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        url.hash(&mut hasher);
        let id = format!("cache_{:x}", hasher.finish());
        
        self.conn.execute(
            "INSERT OR REPLACE INTO agent_cache (id, url, summary, cached_at) VALUES (?1, ?2, ?3, datetime('now'))",
            params![id, url, summary],
        )?;
        Ok(())
    }
    
    /// Get cached summary by URL and optional HTML hash
    #[allow(dead_code)]
    pub fn get_cached_summary_by_hash(&self, url: &str, html_hash: Option<&str>) -> Result<Option<String>> {
        let mut stmt = if let Some(_hash) = html_hash {
            // If hash provided, we could add a hash column later for exact matching
            // For now, just use URL
            self.conn.prepare(
                "SELECT summary FROM agent_cache WHERE url = ?1 ORDER BY cached_at DESC LIMIT 1"
            )?
        } else {
            self.conn.prepare(
                "SELECT summary FROM agent_cache WHERE url = ?1 ORDER BY cached_at DESC LIMIT 1"
            )?
        };
        
        let summary_result = stmt.query_row(params![url], |row| {
            Ok(row.get::<_, String>(0)?)
        });
        
        match summary_result {
            Ok(summary) => Ok(Some(summary)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

// Helper function for optional query results
#[allow(dead_code)]
fn get_optional<T>(row: &rusqlite::Row, idx: usize) -> Result<Option<T>>
where
    T: rusqlite::types::FromSql,
{
    match row.get::<_, T>(idx) {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::InvalidColumnType(_, _, _)) => Ok(None),
        Err(e) => Err(e),
    }
}

