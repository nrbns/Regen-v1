/**
 * Sync Storage
 * Persistent storage for sync data
 */

import type { SyncEvent, SyncState } from './types';

export class SyncStorage {
  private readonly STORAGE_KEY = 'regen_sync_state';

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
