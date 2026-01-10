/**
 * Tab Eviction System
 * Unloads inactive tabs/webviews to save memory in Redix mode
 */

import { type Tab } from '../state/tabsStore';
import { ipc } from '../lib/ipc-typed';

export interface TabSnapshot {
  tabId: string;
  url: string;
  title: string;
  thumbnail?: string; // Base64 thumbnail
  scrollPosition?: { x: number; y: number };
  timestamp: number;
}

const TAB_SNAPSHOTS_KEY = 'redix_tab_snapshots';
const EVICTION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes of inactivity

/**
 * Store snapshot of a tab before eviction
 * FIX: Now captures scroll position from active tab iframe
 */
export function createTabSnapshot(tab: Tab): TabSnapshot {
  // Try to capture scroll position from active iframe
  let scrollPosition: { x: number; y: number } = { x: 0, y: 0 };
  
  if (typeof window !== 'undefined') {
    try {
      // Find iframe for this tab
      const iframe = document.getElementById(`iframe-${tab.id}`) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        const win = iframe.contentWindow;
        scrollPosition = {
          x: win.scrollX || win.pageXOffset || 0,
          y: win.scrollY || win.pageYOffset || 0,
        };
      }
    } catch (error) {
      // Cross-origin restrictions might prevent access
      console.debug(`[TabEviction] Could not capture scroll position for tab ${tab.id}:`, error);
    }
  }

  return {
    tabId: tab.id,
    url: tab.url || '',
    title: tab.title || 'Untitled',
    timestamp: Date.now(),
    scrollPosition,
  };
}

/**
 * Save tab snapshots to localStorage
 */
export function saveTabSnapshots(snapshots: Map<string, TabSnapshot>): void {
  try {
    const serialized = Array.from(snapshots.entries()).map(([id, snapshot]) => [id, snapshot]);
    localStorage.setItem(TAB_SNAPSHOTS_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.warn('[TabEviction] Failed to save snapshots:', error);
  }
}

/**
 * Load tab snapshots from localStorage
 */
export function loadTabSnapshots(): Map<string, TabSnapshot> {
  try {
    const stored = localStorage.getItem(TAB_SNAPSHOTS_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored) as Array<[string, TabSnapshot]>;
    return new Map(parsed);
  } catch (error) {
    console.warn('[TabEviction] Failed to load snapshots:', error);
    return new Map();
  }
}

/**
 * Unload a tab (destroy webview, keep snapshot)
 */
export async function unloadTab(tabId: string, tab: Tab): Promise<void> {
  try {
    // Create snapshot before unloading
    const snapshot = createTabSnapshot(tab);
    const snapshots = loadTabSnapshots();
    snapshots.set(tabId, snapshot);
    saveTabSnapshots(snapshots);

    // Destroy webview via IPC (Tauri/Electron)
    try {
      await ipc.tabs.destroy?.(tabId);
    } catch (error) {
      console.warn(`[TabEviction] Failed to destroy tab ${tabId}:`, error);
    }

    console.log(`[TabEviction] Unloaded tab: ${tabId} (${tab.title})`);
  } catch (error) {
    console.error(`[TabEviction] Error unloading tab ${tabId}:`, error);
  }
}

/**
 * Restore a tab from snapshot (recreate webview)
 * FIX: Now restores scroll position after tab loads
 */
export async function restoreTab(tabId: string, snapshot: TabSnapshot): Promise<void> {
  try {
    // Recreate webview via IPC (Tauri/Electron)
    try {
      await ipc.tabs.create?.(snapshot.url, tabId);
    } catch (error) {
      console.warn(`[TabEviction] Failed to restore tab ${tabId}:`, error);
    }

    // FIX: Restore scroll position after tab loads (for iframe/web mode)
    if (snapshot.scrollPosition && (snapshot.scrollPosition.x > 0 || snapshot.scrollPosition.y > 0)) {
      setTimeout(() => {
        try {
          const iframe = document.getElementById(`iframe-${tabId}`) as HTMLIFrameElement;
          if (iframe?.contentWindow) {
            iframe.contentWindow.scrollTo({
              left: snapshot.scrollPosition?.x || 0,
              top: snapshot.scrollPosition?.y || 0,
              behavior: 'auto', // Instant scroll, not smooth
            });
          }
        } catch (error) {
          // Cross-origin restrictions might prevent scroll restoration
          console.debug(`[TabEviction] Could not restore scroll position for tab ${tabId}:`, error);
        }
      }, 1000); // Wait for iframe to load
    }

    // Remove snapshot after restoration
    const snapshots = loadTabSnapshots();
    snapshots.delete(tabId);
    saveTabSnapshots(snapshots);

    console.log(`[TabEviction] Restored tab: ${tabId} (${snapshot.title})${snapshot.scrollPosition ? ` with scroll position (${snapshot.scrollPosition.x}, ${snapshot.scrollPosition.y})` : ''}`);
  } catch (error) {
    console.error(`[TabEviction] Error restoring tab ${tabId}:`, error);
  }
}

/**
 * Evict inactive tabs (based on lastActiveAt)
 */
export async function evictInactiveTabs(
  tabs: Tab[],
  activeTabId: string | null,
  maxTabs: number = 5
): Promise<string[]> {
  const evicted: string[] = [];

  // Don't evict if we're under the limit
  if (tabs.length <= maxTabs) {
    return evicted;
  }

  // Sort tabs by last active time (oldest first)
  const sortedTabs = [...tabs]
    .filter(tab => tab.id !== activeTabId) // Never evict active tab
    .filter(tab => !tab.pinned) // Never evict pinned tabs
    .sort((a, b) => {
      const aTime = a.lastActiveAt || a.createdAt || 0;
      const bTime = b.lastActiveAt || b.createdAt || 0;
      return aTime - bTime;
    });

  // Evict oldest tabs until under limit
  const tabsToEvict = sortedTabs.slice(0, tabs.length - maxTabs);

  for (const tab of tabsToEvict) {
    const inactiveTime = Date.now() - (tab.lastActiveAt || tab.createdAt || Date.now());

    // Only evict if inactive for threshold time
    if (inactiveTime > EVICTION_THRESHOLD_MS) {
      await unloadTab(tab.id, tab);
      evicted.push(tab.id);
    }
  }

  return evicted;
}

/**
 * Clean up old snapshots (older than 24 hours)
 */
export function cleanupOldSnapshots(): void {
  try {
    const snapshots = loadTabSnapshots();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, snapshot] of snapshots.entries()) {
      if (now - snapshot.timestamp > maxAge) {
        snapshots.delete(id);
      }
    }

    saveTabSnapshots(snapshots);
  } catch (error) {
    console.warn('[TabEviction] Failed to cleanup snapshots:', error);
  }
}

/**
 * Alias for unloadTab (for compatibility with advanced-optimizer)
 * @deprecated Use unloadTab instead
 */
export async function unloadWebview(_tabId: string): Promise<void> {
  // This is a simplified version - advanced-optimizer should use unloadTab with full Tab object
  console.warn('[TabEviction] unloadWebview is deprecated, use unloadTab instead');
}

/**
 * Alias for restoreTab (for compatibility)
 * @deprecated Use restoreTab instead
 */
export async function restoreWebview(_tabId: string): Promise<void> {
  // This is a simplified version - should use restoreTab with TabSnapshot
  console.warn('[TabEviction] restoreWebview is deprecated, use restoreTab instead');
}
