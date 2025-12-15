/**
 * Adblocker Storage
 * Persistent storage for adblocker settings and stats
 */

import Dexie, { type Table } from 'dexie';
import type { AdblockerSettings, AdblockerStats } from './types';

interface SettingsRecord {
  id: string;
  settings: AdblockerSettings;
  updatedAt: number;
}

interface StatsRecord {
  id: string;
  stats: AdblockerStats;
  updatedAt: number;
}

class AdblockerDatabase extends Dexie {
  settings!: Table<SettingsRecord, string>;
  stats!: Table<StatsRecord, string>;

  constructor() {
    super('RegenAdblockerDB');
    this.version(1).stores({
      settings: 'id, updatedAt',
      stats: 'id, updatedAt',
    });
  }
}

export class AdblockerStorage {
  private db: AdblockerDatabase;
  private readonly SETTINGS_ID = 'main';

  constructor() {
    this.db = new AdblockerDatabase();
  }

  /**
   * Load settings
   */
  async loadSettings(): Promise<AdblockerSettings | null> {
    try {
      const record = await this.db.settings.get(this.SETTINGS_ID);
      return record?.settings || null;
    } catch {
      return null;
    }
  }

  /**
   * Save settings
   */
  async saveSettings(settings: AdblockerSettings): Promise<void> {
    await this.db.settings.put({
      id: this.SETTINGS_ID,
      settings,
      updatedAt: Date.now(),
    });
  }

  /**
   * Load stats
   */
  async loadStats(): Promise<AdblockerStats | null> {
    try {
      const record = await this.db.stats.get(this.SETTINGS_ID);
      return record?.stats || null;
    } catch {
      return null;
    }
  }

  /**
   * Save stats
   */
  async saveStats(stats: AdblockerStats): Promise<void> {
    await this.db.stats.put({
      id: this.SETTINGS_ID,
      stats,
      updatedAt: Date.now(),
    });
  }

  /**
   * Reset stats
   */
  async resetStats(): Promise<void> {
    await this.db.stats.delete(this.SETTINGS_ID);
  }
}

// Singleton instance
let storageInstance: AdblockerStorage | null = null;

export function getAdblockerStorage(): AdblockerStorage {
  if (!storageInstance) {
    storageInstance = new AdblockerStorage();
  }
  return storageInstance;
}
