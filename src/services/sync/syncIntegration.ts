/**
 * Sync Integration with Frontend
 * Bridges frontend history/bookmarks with sync service
 */

import { CrossDeviceSyncService } from './syncService';
import type { SyncData } from './types';
import { ipc } from '../../lib/ipc-typed';
import { useSettingsStore } from '../../state/settingsStore';

/**
 * Initialize and configure sync service
 */
let syncServiceInstance: CrossDeviceSyncService | null = null;

export async function initializeSyncService(
  userId: string,
  apiUrl: string,
  syncToken?: string
): Promise<CrossDeviceSyncService> {
  const deviceId = CrossDeviceSyncService.generateDeviceId();

  syncServiceInstance = new CrossDeviceSyncService({
    apiUrl,
    userId,
    deviceId,
    conflictStrategy: 'last-write-wins',
    syncInterval: 5 * 60 * 1000, // 5 minutes
    enableAutoSync: true,
  });

  await syncServiceInstance.initialize();

  // Store sync token if provided
  if (syncToken && typeof localStorage !== 'undefined') {
    localStorage.setItem('regen-sync-token', syncToken);
    localStorage.setItem('regen-sync-user-id', userId);
    localStorage.setItem('regen-device-id', deviceId);
  }

  return syncServiceInstance;
}

/**
 * Get sync service instance
 */
export function getSyncService(): CrossDeviceSyncService | null {
  return syncServiceInstance;
}

/**
 * Sync history from IPC to sync service
 */
export async function syncHistoryToService(): Promise<void> {
  if (!syncServiceInstance) return;

  try {
    // Get local history from IPC
    const localHistory = (await ipc.history.list()) as any[];

    // Get current sync data from storage
    const storage = (syncServiceInstance as any).storage;
    if (!storage) return;
    // const syncData = await storage.getAllSyncData();

    // Merge history
    const historyEntries = localHistory.map((item) => ({
      id: item.id || `history-${item.url}-${item.timestamp}`,
      url: item.url,
      title: item.title || item.url,
      timestamp: item.timestamp || Date.now(),
      visitCount: item.visitCount || 1,
      favicon: item.favicon,
      lastVisitTime: item.lastVisitTime || item.timestamp,
      version: 1,
    }));

    // Update sync storage
    await storage.saveHistory(historyEntries);

    // Trigger sync if online
    if (syncServiceInstance.isOnline()) {
      await syncServiceInstance.syncAll();
    }
  } catch (error) {
    console.error('[Sync] Failed to sync history:', error);
  }
}

/**
 * Sync bookmarks from IPC to sync service
 */
export async function syncBookmarksToService(): Promise<void> {
  if (!syncServiceInstance) return;

  try {
    // Get local bookmarks (assume stored in localStorage or IPC)
    // TODO: Replace with actual bookmarks retrieval
    const localBookmarks: any[] = [];

    const bookmarkEntries = localBookmarks.map((item) => ({
      id: item.id || `bookmark-${item.url}`,
      url: item.url,
      title: item.title || item.url,
      folderId: item.folderId,
      parentId: item.parentId,
      order: item.order || 0,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
      version: 1,
    }));

    const storage = (syncServiceInstance as any).storage;
    if (!storage) return;
    await storage.saveBookmarks(bookmarkEntries);

    if (syncServiceInstance.isOnline()) {
      await syncServiceInstance.syncAll();
    }
  } catch (error) {
    console.error('[Sync] Failed to sync bookmarks:', error);
  }
}

/**
 * Sync settings to sync service
 */
export async function syncSettingsToService(): Promise<void> {
  if (!syncServiceInstance) return;

  try {
    const settingsStore = useSettingsStore.getState();
    const settingsEntries = Object.entries(settingsStore).map(([key, value]) => ({
      key,
      value,
      updatedAt: Date.now(),
      version: 1,
    }));

    const storage = (syncServiceInstance as any).storage;
    if (!storage) return;
    await storage.saveSettings(settingsEntries);

    if (syncServiceInstance.isOnline()) {
      await syncServiceInstance.syncAll();
    }
  } catch (error) {
    console.error('[Sync] Failed to sync settings:', error);
  }
}

/**
 * Apply synced data to local storage
 */
export async function applySyncedDataToLocal(data: SyncData): Promise<void> {
  try {
    // Apply history
    if (data.history && data.history.length > 0) {
      // Merge with existing history
      const existingHistory = (await ipc.history.list()) as any[];
      const historyMap = new Map(existingHistory.map(h => [h.id || h.url, h]));

      for (const entry of data.history) {
        const existing = historyMap.get(entry.id || entry.url);
        if (!existing || (entry.timestamp > (existing.timestamp || 0))) {
          // Add or update history entry
          await ipc.history.add({
            url: entry.url,
            title: entry.title,
            timestamp: entry.timestamp,
          });
        }
      }
    }

    // Apply bookmarks
    if (data.bookmarks && data.bookmarks.length > 0) {
      // TODO: Implement bookmark application
      console.log('[Sync] Bookmarks synced:', data.bookmarks.length);
    }

    // Apply settings
    if (data.settings && data.settings.length > 0) {
      const settingsStore = useSettingsStore.getState();
      for (const setting of data.settings) {
        // Apply setting if it's newer
        const currentValue = (settingsStore as any)[setting.key];
        if (!currentValue || setting.updatedAt > Date.now() - 86400000) {
          // Update setting
          (settingsStore as any)[setting.key] = setting.value;
        }
      }
    }
  } catch (error) {
    console.error('[Sync] Failed to apply synced data:', error);
  }
}

/**
 * Setup sync listeners
 */
export function setupSyncListeners(): void {
  if (typeof window === 'undefined') return;

  // Listen for history changes
  window.addEventListener('online', () => {
    if (syncServiceInstance) {
      syncServiceInstance.syncAll().catch(console.error);
    }
  });

  // Periodic sync
  setInterval(() => {
    if (syncServiceInstance && syncServiceInstance.isOnline()) {
      syncHistoryToService();
      syncBookmarksToService();
      syncSettingsToService();
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

