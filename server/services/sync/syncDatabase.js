/**
 * Sync Database Layer
 * SQLite/PostgreSQL database for sync data storage
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class SyncDatabase {
  constructor(dbPath = null) {
    // Use SQLite by default (can be switched to Postgres)
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'sync.db');
    this.db = null;
    this.usePostgres = process.env.SYNC_DB_TYPE === 'postgres';
  }

  async initialize() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (this.usePostgres) {
      await this.initializePostgres();
    } else {
      await this.initializeSQLite();
    }
  }

  async initializeSQLite() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_data (
        user_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        data_id TEXT NOT NULL,
        data_content TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at INTEGER NOT NULL,
        device_id TEXT,
        PRIMARY KEY (user_id, data_type, data_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sync_user_type ON sync_data(user_id, data_type);
      CREATE INDEX IF NOT EXISTS idx_sync_updated ON sync_data(updated_at);
      CREATE INDEX IF NOT EXISTS idx_sync_device ON sync_data(device_id);

      CREATE TABLE IF NOT EXISTS sync_metadata (
        user_id TEXT PRIMARY KEY,
        last_synced INTEGER,
        version INTEGER DEFAULT 1,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        data_id TEXT NOT NULL,
        change_type TEXT NOT NULL,
        device_id TEXT,
        timestamp INTEGER NOT NULL,
        processed BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id, data_type, data_id) REFERENCES sync_data(user_id, data_type, data_id)
      );

      CREATE INDEX IF NOT EXISTS idx_changes_user_time ON sync_changes(user_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_changes_processed ON sync_changes(processed);
    `);
  }

  async initializePostgres() {
    // TODO: Implement PostgreSQL support
    // For now, fall back to SQLite
    await this.initializeSQLite();
  }

  /**
   * Get all sync data for a user
   */
  async getSyncData(userId) {
    const stmt = this.db.prepare(`
      SELECT data_type, data_id, data_content, version, updated_at, device_id
      FROM sync_data
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all(userId);

    const data = {
      history: [],
      bookmarks: [],
      bookmarkFolders: [],
      settings: {},
      lastSynced: 0,
    };

    for (const row of rows) {
      const content = JSON.parse(row.data_content);
      switch (row.data_type) {
        case 'history':
          data.history.push({
            ...content,
            version: row.version,
            updatedAt: row.updated_at,
            deviceId: row.device_id,
          });
          break;
        case 'bookmark':
          data.bookmarks.push({
            ...content,
            version: row.version,
            updatedAt: row.updated_at,
            deviceId: row.device_id,
          });
          break;
        case 'bookmarkFolder':
          data.bookmarkFolders.push({
            ...content,
            version: row.version,
            updatedAt: row.updated_at,
            deviceId: row.device_id,
          });
          break;
        case 'setting':
          data.settings[content.key] = {
            ...content,
            version: row.version,
            updatedAt: row.updated_at,
          };
          break;
      }
    }

    // Get last synced timestamp
    const metaStmt = this.db.prepare('SELECT last_synced FROM sync_metadata WHERE user_id = ?');
    const meta = metaStmt.get(userId);
    if (meta) {
      data.lastSynced = meta.last_synced || 0;
    }

    return data;
  }

  /**
   * Save sync data
   */
  async saveSyncData(userId, data) {
    const transaction = this.db.transaction(() => {
      // Save history
      const historyStmt = this.db.prepare(`
        INSERT INTO sync_data (user_id, data_type, data_id, data_content, version, updated_at, device_id)
        VALUES (?, 'history', ?, ?, COALESCE((SELECT version FROM sync_data WHERE user_id = ? AND data_type = 'history' AND data_id = ?), 0) + 1, ?, ?)
        ON CONFLICT(user_id, data_type, data_id) DO UPDATE SET
          data_content = excluded.data_content,
          version = excluded.version,
          updated_at = excluded.updated_at,
          device_id = excluded.device_id
      `);

      for (const item of data.history || []) {
        historyStmt.run(
          userId,
          item.id,
          JSON.stringify(item),
          userId,
          item.id,
          item.timestamp || Date.now(),
          item.deviceId || null
        );
      }

      // Save bookmarks
      const bookmarkStmt = this.db.prepare(`
        INSERT INTO sync_data (user_id, data_type, data_id, data_content, version, updated_at, device_id)
        VALUES (?, 'bookmark', ?, ?, COALESCE((SELECT version FROM sync_data WHERE user_id = ? AND data_type = 'bookmark' AND data_id = ?), 0) + 1, ?, ?)
        ON CONFLICT(user_id, data_type, data_id) DO UPDATE SET
          data_content = excluded.data_content,
          version = excluded.version,
          updated_at = excluded.updated_at,
          device_id = excluded.device_id
      `);

      for (const item of data.bookmarks || []) {
        bookmarkStmt.run(
          userId,
          item.id,
          JSON.stringify(item),
          userId,
          item.id,
          item.updatedAt || Date.now(),
          item.deviceId || null
        );
      }

      // Save settings
      const settingStmt = this.db.prepare(`
        INSERT INTO sync_data (user_id, data_type, data_id, data_content, version, updated_at, device_id)
        VALUES (?, 'setting', ?, ?, COALESCE((SELECT version FROM sync_data WHERE user_id = ? AND data_type = 'setting' AND data_id = ?), 0) + 1, ?, ?)
        ON CONFLICT(user_id, data_type, data_id) DO UPDATE SET
          data_content = excluded.data_content,
          version = excluded.version,
          updated_at = excluded.updated_at
      `);

      for (const [key, value] of Object.entries(data.settings || {})) {
        settingStmt.run(
          userId,
          key,
          JSON.stringify({ key, value }),
          userId,
          key,
          value.updatedAt || Date.now(),
          value.deviceId || null
        );
      }

      // Update metadata
      const metaStmt = this.db.prepare(`
        INSERT INTO sync_metadata (user_id, last_synced, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          last_synced = excluded.last_synced,
          updated_at = excluded.updated_at
      `);
      metaStmt.run(userId, data.lastSynced || Date.now(), Date.now());
    });

    transaction();
  }

  /**
   * Get changes since timestamp
   */
  async getChangesSince(userId, sinceTimestamp, excludeDeviceId = null) {
    const stmt = this.db.prepare(`
      SELECT data_type, data_id, data_content, version, updated_at, device_id
      FROM sync_data
      WHERE user_id = ? 
        AND updated_at > ?
        AND (device_id IS NULL OR device_id != ?)
      ORDER BY updated_at ASC
    `);

    const rows = stmt.all(userId, sinceTimestamp, excludeDeviceId || '');

    const delta = {
      history: { added: [], updated: [], deleted: [] },
      bookmarks: { added: [], updated: [], deleted: [] },
      settings: { updated: [], deleted: [] },
      lastSynced: Date.now(),
    };

    for (const row of rows) {
      const content = JSON.parse(row.data_content);
      const item = {
        ...content,
        version: row.version,
        updatedAt: row.updated_at,
        deviceId: row.device_id,
      };

      // Determine if added or updated (simplified - could check against local state)
      if (row.updated_at > sinceTimestamp + 1000) {
        // Likely a new item or significant update
        switch (row.data_type) {
          case 'history':
            delta.history.updated.push(item);
            break;
          case 'bookmark':
            delta.bookmarks.updated.push(item);
            break;
          case 'setting':
            delta.settings.updated.push(item);
            break;
        }
      }
    }

    return delta;
  }

  /**
   * Apply changes (delta)
   */
  async applyChanges(userId, deviceId, delta) {
    // This would merge delta with existing data
    // For now, delegate to saveSyncData
    const currentData = await this.getSyncData(userId);

    // Merge delta into current data
    // (Simplified - full implementation would handle deletions properly)
    const merged = {
      history: [...currentData.history, ...(delta.history?.added || [])],
      bookmarks: [...currentData.bookmarks, ...(delta.bookmarks?.added || [])],
      settings: { ...currentData.settings },
      lastSynced: delta.lastSynced || Date.now(),
    };

    // Update items
    if (delta.history?.updated) {
      for (const update of delta.history.updated) {
        const index = merged.history.findIndex(h => h.id === update.id);
        if (index >= 0) {
          merged.history[index] = update;
        } else {
          merged.history.push(update);
        }
      }
    }

    // Apply deletions
    if (delta.history?.deleted) {
      const deletedSet = new Set(delta.history.deleted);
      merged.history = merged.history.filter(h => !deletedSet.has(h.id));
    }

    await this.saveSyncData(userId, merged);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId) {
    const metaStmt = this.db.prepare('SELECT * FROM sync_metadata WHERE user_id = ?');
    const meta = metaStmt.get(userId);

    const countStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN data_type = 'history' THEN 1 ELSE 0 END) as history_count,
        SUM(CASE WHEN data_type = 'bookmark' THEN 1 ELSE 0 END) as bookmark_count
      FROM sync_data
      WHERE user_id = ?
    `);
    const counts = countStmt.get(userId);

    return {
      lastSynced: meta?.last_synced || null,
      version: meta?.version || 1,
      totalItems: counts?.total || 0,
      historyCount: counts?.history_count || 0,
      bookmarkCount: counts?.bookmark_count || 0,
    };
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(userId, conflicts, strategy = 'last-write-wins') {
    const resolved = [];

    for (const conflict of conflicts) {
      const stmt = this.db.prepare(`
        SELECT data_content, version, updated_at
        FROM sync_data
        WHERE user_id = ? AND data_type = ? AND data_id = ?
      `);

      const row = stmt.get(userId, conflict.type, conflict.id);
      if (!row) continue;

      let resolvedItem;

      switch (strategy) {
        case 'last-write-wins': {
          const localTime = conflict.local.updatedAt || 0;
          const remoteTime = conflict.remote.updatedAt || 0;
          resolvedItem = localTime > remoteTime ? conflict.local : conflict.remote;
          break;
        }
        case 'server-wins':
          resolvedItem = conflict.remote;
          break;
        case 'client-wins':
          resolvedItem = conflict.local;
          break;
        default:
          resolvedItem = conflict.remote; // Default to server
      }

      // Update in database
      const updateStmt = this.db.prepare(`
        UPDATE sync_data
        SET data_content = ?, version = version + 1, updated_at = ?
        WHERE user_id = ? AND data_type = ? AND data_id = ?
      `);

      updateStmt.run(JSON.stringify(resolvedItem), Date.now(), userId, conflict.type, conflict.id);

      resolved.push(resolvedItem);
    }

    return resolved;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
let syncDbInstance = null;

function getSyncDatabase(dbPath = null) {
  if (!syncDbInstance) {
    syncDbInstance = new SyncDatabase(dbPath);
  }
  return syncDbInstance;
}

module.exports = { SyncDatabase, getSyncDatabase };
