/**
 * Sync Service - Tier 3 Pillar 3
 * Sync workspaces, settings, bookmarks across devices
 */

import { authService } from './auth';
import { useWorkspacesStore } from '../state/workspacesStore';
import { useBookmarksStore } from '../state/bookmarksStore';
import { useSettingsStore } from '../state/settingsStore';
import { log } from '../utils/logger';
import { track } from './analytics';

export type SyncData = {
  workspaces: unknown[];
  bookmarks: unknown[];
  settings: unknown;
  version: number;
  syncedAt: number;
};

export type SyncConflict = {
  type: 'workspace' | 'bookmark' | 'setting';
  local: unknown;
  remote: unknown;
  key: string;
};

class SyncService {
  private syncEnabled = false;
  private lastSyncAt: number | null = null;
  private syncInProgress = false;

  /**
   * Enable sync
   */
  async enable(): Promise<boolean> {
    const authState = authService.getState();
    if (!authState.isAuthenticated) {
      log.warn('[Sync] Cannot enable sync without authentication');
      return false;
    }

    this.syncEnabled = true;
    localStorage.setItem('omnibrowser_sync_enabled', 'true');
    log.info('[Sync] Sync enabled');
    track('sync_enabled');

    // Perform initial sync
    await this.sync();

    return true;
  }

  /**
   * Disable sync
   */
  disable(): void {
    this.syncEnabled = false;
    localStorage.removeItem('omnibrowser_sync_enabled');
    log.info('[Sync] Sync disabled');
    track('sync_disabled');
  }

  /**
   * Check if sync is enabled
   */
  isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('omnibrowser_sync_enabled');
    return stored === 'true' && authService.getState().isAuthenticated;
  }

  /**
   * Pull data from server
   */
  async pull(): Promise<SyncData | null> {
    const authState = authService.getState();
    if (!authState.isAuthenticated || !authState.user) {
      return null;
    }

    try {
      // TODO: Call backend API
      // GET /api/sync/pull?userId={userId}
      log.info('[Sync] Pulling data from server');

      // For now, return null (no remote data)
      return null;
    } catch (error) {
      log.error('[Sync] Pull failed:', error);
      return null;
    }
  }

  /**
   * Push data to server
   */
  async push(): Promise<boolean> {
    const authState = authService.getState();
    if (!authState.isAuthenticated || !authState.user) {
      return false;
    }

    try {
      const data: SyncData = {
        workspaces: useWorkspacesStore.getState().workspaces,
        bookmarks: useBookmarksStore.getState().bookmarks,
        settings: useSettingsStore.getState(),
        version: 1,
        syncedAt: Date.now(),
      };

      // TODO: Call backend API
      // POST /api/sync/push
      log.info('[Sync] Pushing data to server');

      this.lastSyncAt = Date.now();
      track('sync_pushed', { itemCount: data.workspaces.length + data.bookmarks.length });

      return true;
    } catch (error) {
      log.error('[Sync] Push failed:', error);
      return false;
    }
  }

  /**
   * Sync (pull + merge + push)
   */
  async sync(): Promise<{ success: boolean; conflicts?: SyncConflict[] }> {
    if (this.syncInProgress) {
      log.warn('[Sync] Sync already in progress');
      return { success: false };
    }

    if (!this.isEnabled()) {
      log.warn('[Sync] Sync not enabled');
      return { success: false };
    }

    this.syncInProgress = true;

    try {
      // Pull remote data
      const remoteData = await this.pull();

      if (remoteData) {
        // Merge with local data
        const conflicts = await this.merge(remoteData);

        if (conflicts.length > 0) {
          log.warn('[Sync] Conflicts detected:', conflicts.length);
          track('sync_conflicts', { count: conflicts.length });
          return { success: true, conflicts };
        }
      }

      // Push local changes
      await this.push();

      this.lastSyncAt = Date.now();
      track('sync_completed');

      return { success: true };
    } catch (error) {
      log.error('[Sync] Sync failed:', error);
      track('sync_failed', { error: String(error) });
      return { success: false };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Merge remote data with local (last-write-wins for v1)
   */
  private async merge(remoteData: SyncData): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Merge workspaces (last-write-wins)
    const _localWorkspaces = useWorkspacesStore.getState().workspaces;
    const remoteWorkspaces = remoteData.workspaces as typeof _localWorkspaces;

    // Simple merge: remote wins if newer
    if (remoteData.syncedAt > (this.lastSyncAt || 0)) {
      useWorkspacesStore.setState({ workspaces: remoteWorkspaces });
    }

    // Merge bookmarks (last-write-wins)
    const _localBookmarks = useBookmarksStore.getState().bookmarks;
    const remoteBookmarks = remoteData.bookmarks as typeof _localBookmarks;

    if (remoteData.syncedAt > (this.lastSyncAt || 0)) {
      useBookmarksStore.setState({ bookmarks: remoteBookmarks });
    }

    // Merge settings (last-write-wins)
    const _localSettings = useSettingsStore.getState();
    const remoteSettings = remoteData.settings as typeof _localSettings;

    if (remoteData.syncedAt > (this.lastSyncAt || 0)) {
      useSettingsStore.setState(remoteSettings);
    }

    return conflicts;
  }

  /**
   * Get last sync time
   */
  getLastSyncAt(): number | null {
    return this.lastSyncAt;
  }

  /**
   * Auto-sync on interval
   */
  startAutoSync(intervalMs = 5 * 60 * 1000): void {
    // Sync every 5 minutes if enabled
    setInterval(() => {
      if (this.isEnabled() && !this.syncInProgress) {
        this.sync().catch(error => {
          log.error('[Sync] Auto-sync failed:', error);
        });
      }
    }, intervalMs);
  }
}

// Singleton instance
export const syncService = new SyncService();
