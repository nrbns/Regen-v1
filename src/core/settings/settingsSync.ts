/**
 * Settings Sync - Sync settings to backend (stub for now)
 * Phase 1, Day 4: Settings Panel improvements
 */

import { useSettingsStore } from '../../state/settingsStore';
import { toast } from '../../utils/toast';

// Phase 1, Day 4: Sync stub - will be implemented when backend is ready
let syncEnabled = false;
let lastSyncTime: number | null = null;

/**
 * Phase 1, Day 4: Enable/disable settings sync
 */
export function setSyncEnabled(enabled: boolean): void {
  syncEnabled = enabled;
  if (enabled) {
    toast.info('Settings sync enabled (stub - will sync when backend is ready)');
  } else {
    toast.info('Settings sync disabled');
  }
}

/**
 * Phase 1, Day 4: Check if sync is enabled
 */
export function isSyncEnabled(): boolean {
  return syncEnabled;
}

/**
 * Phase 1, Day 4: Sync settings to backend (stub)
 */
export async function syncSettingsToBackend(): Promise<boolean> {
  if (!syncEnabled) {
    return false;
  }

  try {
    const settings = useSettingsStore.getState();
    
    // Phase 1, Day 4: Stub implementation - just save locally for now
    // In the future, this will POST to /api/settings/sync
    const settingsData = {
      general: settings.general,
      privacy: settings.privacy,
      appearance: settings.appearance,
      account: {
        displayName: settings.account.displayName,
        email: settings.account.email,
        workspace: settings.account.workspace,
        avatarColor: settings.account.avatarColor,
      },
      searchEngine: settings.searchEngine,
      language: settings.language,
    };

    // TODO: Replace with actual API call when backend is ready
    // await fetch('/api/settings/sync', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(settingsData),
    // });

    // For now, just update lastSyncTime
    lastSyncTime = Date.now();
    
    // Store sync timestamp locally
    localStorage.setItem('regen:settings:lastSync', lastSyncTime.toString());
    
    console.log('[SettingsSync] Settings synced (stub)', settingsData);
    return true;
  } catch (error) {
    console.error('[SettingsSync] Failed to sync settings', error);
    toast.error('Failed to sync settings');
    return false;
  }
}

/**
 * Phase 1, Day 4: Get last sync time
 */
export function getLastSyncTime(): number | null {
  if (lastSyncTime) {
    return lastSyncTime;
  }
  
  const stored = localStorage.getItem('regen:settings:lastSync');
  if (stored) {
    return parseInt(stored, 10);
  }
  
  return null;
}

/**
 * Phase 1, Day 4: Auto-sync settings when they change
 */
export function setupAutoSync(): () => void {
  if (!syncEnabled) {
    return () => {}; // No-op cleanup
  }

  // Subscribe to settings changes
  // SECURITY: Fix Zustand subscribe - use listener pattern
  const unsubscribe = useSettingsStore.subscribe(() => {
      // Debounce sync calls (wait 2 seconds after last change)
      const syncTimer = setTimeout(() => {
        syncSettingsToBackend().catch(() => {
          // Silent fail - user will see error toast if needed
        });
      }, 2000);

      return () => clearTimeout(syncTimer);
    }
  );

  return unsubscribe;
}

