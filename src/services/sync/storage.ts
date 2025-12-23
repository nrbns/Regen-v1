/**
 * Sync Storage
 * Persistent storage for sync data
 */

import type {
  SyncBookmark,
  SyncData,
  SyncEvent,
  SyncHistoryEntry,
  SyncSetting,
  SyncState,
} from './types';

export class SyncStorage {
  private readonly STORAGE_KEY = 'regen_sync_state';
  private readonly DATA_KEY = 'regen_sync_data';

  async initialize(_password?: string): Promise<void> {
    // No-op for local storage implementation
    return Promise.resolve();
  }

  private loadData(): SyncData {
    try {
      const raw = localStorage.getItem(this.DATA_KEY);
      if (raw) return JSON.parse(raw) as SyncData;
    } catch {
      // fall back to defaults below
    }

    return {
      history: [],
      bookmarks: [],
      bookmarkFolders: [],
      settings: [],
      lastSynced: 0,
      version: 1,
    };
  }

  /**
   * Load sync state
   */
  async loadState(): Promise<SyncState> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data
        ? JSON.parse(data)
        : {
            lastSyncTime: 0,
            pendingEvents: [],
            isOnline: true,
          };
    } catch {
      return {
        lastSyncTime: 0,
        pendingEvents: [],
        isOnline: true,
      };
    }
  }

  /**
   * Save sync state
   */
  async saveState(state: SyncState): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  async getAllSyncData(): Promise<SyncData> {
    return this.loadData();
  }

  async saveAllSyncData(data: SyncData): Promise<void> {
    localStorage.setItem(this.DATA_KEY, JSON.stringify(data));
  }

  async saveHistory(history: SyncHistoryEntry[]): Promise<void> {
    const data = this.loadData();
    data.history = history;
    await this.saveAllSyncData(data);
  }

  async saveBookmarks(bookmarks: SyncBookmark[]): Promise<void> {
    const data = this.loadData();
    data.bookmarks = bookmarks;
    await this.saveAllSyncData(data);
  }

  async saveSettings(settings: SyncSetting[]): Promise<void> {
    const data = this.loadData();
    data.settings = settings;
    await this.saveAllSyncData(data);
  }

  /**
   * Add pending event
   */
  async addEvent(event: SyncEvent): Promise<void> {
    const state = await this.loadState();
    state.pendingEvents.push(event);
    await this.saveState(state);
  }

  /**
   * Clear pending events
   */
  async clearPendingEvents(): Promise<void> {
    const state = await this.loadState();
    state.pendingEvents = [];
    await this.saveState(state);
  }
}

let storage: SyncStorage | null = null;

export function getSyncStorage(): SyncStorage {
  if (!storage) {
    storage = new SyncStorage();
  }
  return storage;
}

// Alias for encrypted storage (encryption handled at service layer)
export { SyncStorage as EncryptedSyncStorage };
