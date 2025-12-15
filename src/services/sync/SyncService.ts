/**
 * Cross-Device Sync Service
 * Main sync service interface for history, bookmarks, and settings
 */

import { EncryptedSyncStorage } from './storage';
import {
  mergeWithConflictResolution,
  detectDeletions,
  type ConflictStrategy,
} from './conflictResolver';
import type { SyncData, SyncDelta, SyncStatus, SyncResult, ConflictEntry } from './types';

export interface SyncServiceConfig {
  apiUrl: string;
  userId: string;
  deviceId: string;
  conflictStrategy?: ConflictStrategy;
  syncInterval?: number; // Auto-sync interval in ms
  enableAutoSync?: boolean;
}

export class CrossDeviceSyncService {
  private storage: EncryptedSyncStorage;
  private config: SyncServiceConfig;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncTime: number | null = null;
  private lastSyncError: string | null = null;
  private pendingChanges = 0;
  private conflictCount = 0;

  constructor(config: SyncServiceConfig) {
    this.config = {
      conflictStrategy: 'last-write-wins',
      syncInterval: 5 * 60 * 1000, // 5 minutes
      enableAutoSync: true,
      ...config,
    };
    this.storage = new EncryptedSyncStorage(config.userId);
  }

  /**
   * Initialize the sync service
   */
  async initialize(password?: string): Promise<void> {
    await this.storage.initialize(password);

    // Set up online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.config.enableAutoSync) {
          this.syncAll();
        }
      });

      window.addEventListener('offline', () => {
        console.log('[Sync] Device went offline - queuing changes');
      });
    }

    // Start auto-sync if enabled
    if (this.config.enableAutoSync && this.config.syncInterval) {
      this.startAutoSync();
    }
  }

  /**
   * Start automatic sync at intervals
   */
  private startAutoSync(): void {
    if (this.syncIntervalId) return;

    this.syncIntervalId = setInterval(() => {
      if (this.isOnline() && !this.isSyncing) {
        this.syncAll();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastSyncError: this.lastSyncError,
      pendingChanges: this.pendingChanges,
      conflictCount: this.conflictCount,
    };
  }

  /**
   * Sync all data (history, bookmarks, settings)
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    if (!this.isOnline()) {
      return { success: false, error: 'Device is offline' };
    }

    this.isSyncing = true;
    this.lastSyncError = null;

    try {
      // Get local data
      const localData = await this.storage.getAllSyncData();

      // Get remote data (delta sync)
      const remoteDelta = await this.fetchRemoteDelta(localData.lastSynced);

      // Merge and resolve conflicts
      const merged = await this.mergeData(localData, remoteDelta);

      // Push local changes to server
      await this.pushLocalChanges(localData, merged);

      // Save merged data locally
      await this.storage.saveAllSyncData({
        ...merged,
        lastSynced: Date.now(),
      });

      this.lastSyncTime = Date.now();
      this.pendingChanges = 0;

      return {
        success: true,
        syncedItems: {
          history: merged.history.length,
          bookmarks: merged.bookmarks.length,
          settings: merged.settings.length,
        },
      };
    } catch (error: any) {
      this.lastSyncError = error.message || 'Sync failed';
      console.error('[Sync] Sync failed:', error);
      return {
        success: false,
        error: this.lastSyncError,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Fetch remote changes since last sync
   */
  private async fetchRemoteDelta(lastSynced: number): Promise<SyncDelta> {
    const response = await fetch(
      `${this.config.apiUrl}/sync/${this.config.userId}/delta?since=${lastSynced}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.config.deviceId,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch remote delta: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Merge local and remote data, resolving conflicts
   */
  private async mergeData(local: SyncData, remote: SyncDelta): Promise<SyncData> {
    const strategy = this.config.conflictStrategy || 'last-write-wins';
    const conflicts: ConflictEntry[] = [];

    // Merge history
    let mergedHistory = local.history;
    if (remote.history) {
      // Add new items
      if (remote.history.added) {
        mergedHistory = [...mergedHistory, ...remote.history.added];
      }

      // Update existing items
      if (remote.history.updated) {
        const remoteMap = new Map(remote.history.updated.map(item => [item.id, item]));
        mergedHistory = mergedHistory.map(item => {
          const remoteItem = remoteMap.get(item.id);
          if (remoteItem) {
            // Check for conflict
            const localVersion = item.version || 0;
            const remoteVersion = remoteItem.version || 0;
            if (localVersion !== remoteVersion) {
              conflicts.push({
                type: 'history',
                id: item.id,
                local: item,
                remote: remoteItem,
                strategy,
                resolved: false,
              });
            }
            return mergeWithConflictResolution([item], [remoteItem], strategy)[0];
          }
          return item;
        });
      }

      // Remove deleted items
      if (remote.history.deleted) {
        const deletedSet = new Set(remote.history.deleted);
        mergedHistory = mergedHistory.filter(item => !deletedSet.has(item.id));
      }
    }

    // Merge bookmarks (similar logic)
    let mergedBookmarks = local.bookmarks;
    if (remote.bookmarks) {
      if (remote.bookmarks.added) {
        mergedBookmarks = [...mergedBookmarks, ...remote.bookmarks.added];
      }
      if (remote.bookmarks.updated) {
        const remoteMap = new Map(remote.bookmarks.updated.map(item => [item.id, item]));
        mergedBookmarks = mergedBookmarks.map(item => {
          const remoteItem = remoteMap.get(item.id);
          if (remoteItem) {
            return mergeWithConflictResolution([item], [remoteItem], strategy)[0];
          }
          return item;
        });
      }
      if (remote.bookmarks.deleted) {
        const deletedSet = new Set(remote.bookmarks.deleted);
        mergedBookmarks = mergedBookmarks.filter(item => !deletedSet.has(item.id));
      }
    }

    // Merge settings (similar logic)
    let mergedSettings = local.settings;
    if (remote.settings) {
      if (remote.settings.updated) {
        const remoteMap = new Map(remote.settings.updated.map(item => [item.key, item]));
        mergedSettings = mergedSettings.map(item => {
          const remoteItem = remoteMap.get(item.key);
          if (remoteItem) {
            return mergeWithConflictResolution([item], [remoteItem], strategy)[0];
          }
          return item;
        });
      }
    }

    this.conflictCount = conflicts.length;

    return {
      history: mergedHistory,
      bookmarks: mergedBookmarks,
      bookmarkFolders: local.bookmarkFolders, // TODO: Implement folder sync
      settings: mergedSettings,
      lastSynced: remote.lastSynced || Date.now(),
      version: local.version + 1,
    };
  }

  /**
   * Push local changes to server
   */
  private async pushLocalChanges(local: SyncData, merged: SyncData): Promise<void> {
    // Calculate delta (what changed locally)
    const delta: SyncDelta = {
      history: {
        added: this.findNewItems(local.history, merged.history),
        updated: this.findUpdatedItems(local.history, merged.history),
        deleted: detectDeletions(local.history, merged.history),
      },
      bookmarks: {
        added: this.findNewItems(local.bookmarks, merged.bookmarks),
        updated: this.findUpdatedItems(local.bookmarks, merged.bookmarks),
        deleted: detectDeletions(local.bookmarks, merged.bookmarks),
      },
      settings: {
        updated: this.findUpdatedItems(local.settings, merged.settings, 'key'),
        deleted: [],
      },
      lastSynced: Date.now(),
    };

    const response = await fetch(`${this.config.apiUrl}/sync/${this.config.userId}/delta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': this.config.deviceId,
      },
      body: JSON.stringify(delta),
    });

    if (!response.ok) {
      throw new Error(`Failed to push local changes: ${response.statusText}`);
    }
  }

  /**
   * Find new items in local that aren't in merged
   */
  private findNewItems<T extends { id: string }>(local: T[], merged: T[]): T[] {
    const mergedIds = new Set(merged.map(item => item.id));
    return local.filter(item => !mergedIds.has(item.id));
  }

  /**
   * Find updated items (different versions or timestamps)
   */
  private findUpdatedItems<T extends { id: string; version?: number; updatedAt?: number }>(
    local: T[],
    merged: T[],
    idField: 'id' | 'key' = 'id'
  ): T[] {
    const mergedMap = new Map(merged.map(item => [item[idField], item]));
    return local.filter(item => {
      const mergedItem = mergedMap.get(item[idField]);
      if (!mergedItem) return false;

      const localVersion = item.version || 0;
      const mergedVersion = mergedItem.version || 0;
      const localTime = item.updatedAt || 0;
      const mergedTime = mergedItem.updatedAt || 0;

      // Updated if version differs or timestamp is newer
      return localVersion > mergedVersion || localTime > mergedTime;
    });
  }

  /**
   * Generate device ID
   */
  static generateDeviceId(): string {
    // Use existing device ID from localStorage or generate new one
    if (typeof localStorage !== 'undefined') {
      let deviceId = localStorage.getItem('regen-device-id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('regen-device-id', deviceId);
      }
      return deviceId;
    }
    return crypto.randomUUID();
  }

  /**
   * Sync method (alias for syncAll)
   */
  async sync(): Promise<{ success: boolean; error?: string }> {
    const result = await this.syncAll();
    return {
      success: result.success,
      error: result.error,
    };
  }
}
