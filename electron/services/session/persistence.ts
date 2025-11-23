/**
 * Session Persistence - SQLite-based storage for tabs, history, settings
 * Replaces in-memory storage with durable persistence
 */

import { app } from 'electron';
import * as path from 'node:path';

const DB_PATH = path.join(app.getPath('userData'), 'omnibrowser-session.db');

// Dynamically import better-sqlite3 (optional dependency)
let Database: any = null;
let dbModuleAvailable = false;

try {
  // @ts-ignore - better-sqlite3 is optional dependency, types may not be available
  Database = require('better-sqlite3');
  dbModuleAvailable = true;
} catch (error) {
  console.warn(
    '[SessionPersistence] better-sqlite3 not available, using in-memory fallback:',
    error
  );
  dbModuleAvailable = false;
}

interface TabRecord {
  id: string;
  url: string;
  title: string;
  active: boolean;
  position: number;
  containerId?: string;
  mode: string;
  createdAt: number;
  lastActiveAt: number;
  sessionId: string;
}

interface HistoryRecord {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitAt: number;
  typedCount: number;
}

class SessionPersistence {
  private db: any = null;
  private isAvailable = dbModuleAvailable;

  async initialize() {
    if (!this.isAvailable) {
      console.warn('[SessionPersistence] SQLite not available, persistence disabled');
      return;
    }

    if (this.db) return;

    try {
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    } catch (error) {
      console.error('[SessionPersistence] Failed to initialize database:', error);
      this.isAvailable = false;
      return;
    }

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tabs (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL,
        containerId TEXT,
        mode TEXT NOT NULL DEFAULT 'normal',
        createdAt INTEGER NOT NULL,
        lastActiveAt INTEGER NOT NULL,
        sessionId TEXT NOT NULL,
        windowId INTEGER
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        visitCount INTEGER NOT NULL DEFAULT 1,
        lastVisitAt INTEGER NOT NULL,
        typedCount INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tabs_session ON tabs(sessionId);
      CREATE INDEX IF NOT EXISTS idx_tabs_window ON tabs(windowId);
      CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
      CREATE INDEX IF NOT EXISTS idx_history_visit ON history(lastVisitAt);
    `);
  }

  async saveTabs(winId: number, tabs: TabRecord[], sessionId: string) {
    if (!this.isAvailable) return;
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO tabs (id, url, title, active, position, containerId, mode, createdAt, lastActiveAt, sessionId, windowId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db!.transaction((tabs: TabRecord[]) => {
      for (const tab of tabs) {
        stmt.run(
          tab.id,
          tab.url,
          tab.title,
          tab.active ? 1 : 0,
          tab.position,
          tab.containerId || null,
          tab.mode,
          tab.createdAt,
          tab.lastActiveAt,
          sessionId,
          winId
        );
      }
    });

    transaction(tabs);
  }

  async loadTabs(winId: number, sessionId: string): Promise<TabRecord[]> {
    if (!this.isAvailable) return [];
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const stmt = this.db!.prepare(`
      SELECT * FROM tabs 
      WHERE windowId = ? AND sessionId = ?
      ORDER BY position ASC
    `);

    const rows = stmt.all(winId, sessionId) as any[];
    return rows.map(row => ({
      ...row,
      active: row.active === 1,
    }));
  }

  async addHistory(url: string, title: string, typed: boolean = false) {
    if (!this.isAvailable) return;
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const stmt = this.db!.prepare(`
      INSERT INTO history (id, url, title, visitCount, lastVisitAt, typedCount)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        visitCount = visitCount + 1,
        lastVisitAt = excluded.lastVisitAt,
        typedCount = typedCount + (CASE WHEN excluded.typedCount > 0 THEN 1 ELSE 0 END)
    `);

    const id = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    stmt.run(id, url, title, Date.now(), typed ? 1 : 0);
  }

  async getHistory(limit: number = 100): Promise<HistoryRecord[]> {
    if (!this.isAvailable) return [];
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const stmt = this.db!.prepare(`
      SELECT * FROM history
      ORDER BY lastVisitAt DESC
      LIMIT ?
    `);

    return stmt.all(limit) as HistoryRecord[];
  }

  async searchHistory(query: string, limit: number = 20): Promise<HistoryRecord[]> {
    if (!this.isAvailable) return [];
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const stmt = this.db!.prepare(`
      SELECT * FROM history
      WHERE url LIKE ? OR title LIKE ?
      ORDER BY visitCount DESC, lastVisitAt DESC
      LIMIT ?
    `);

    const pattern = `%${query}%`;
    return stmt.all(pattern, pattern, limit) as HistoryRecord[];
  }

  async saveSetting(key: string, value: unknown) {
    if (!this.isAvailable) return;
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt)
      VALUES (?, ?, ?)
    `);

    stmt.run(key, JSON.stringify(value), Date.now());
  }

  async getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    if (!this.isAvailable) return defaultValue;
    if (!this.db) await this.initialize();
    if (!this.db) return defaultValue;

    const stmt = this.db!.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;

    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return defaultValue;
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const sessionPersistence = new SessionPersistence();
