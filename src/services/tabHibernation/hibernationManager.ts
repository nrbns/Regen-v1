/**
 * SPRINT 1: Tab Hibernation Manager
 * Automatic suspension of inactive tabs, memory budgets, and session snapshots
 */

import { useTabsStore, type Tab } from '../../state/tabsStore';
import { saveScrollPosition, restoreScrollPosition, type HibernationState } from '../../core/tabs/hibernation';

// SPRINT 1: Configuration
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MEMORY_BUDGET_BASE_MB = 50; // Base memory budget per tab
const MEMORY_BUDGET_ACTIVE_MB = 100; // Additional memory for active tabs
const CHECK_INTERVAL_MS = 60000; // Check every minute

interface TabMemoryUsage {
  tabId: string;
  memoryMB: number;
  timestamp: number;
}

// Track tab memory usage (would be enhanced with actual measurement in production)
const _tabMemoryUsage = new Map<string, TabMemoryUsage>();

// Track inactive timers
const inactivityTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Calculate memory budget for a tab
 */
export function getTabMemoryBudget(tab: Tab, isActive: boolean): number {
  const base = MEMORY_BUDGET_BASE_MB;
  const active = isActive ? MEMORY_BUDGET_ACTIVE_MB : 0;
  return base + active;
}

/**
 * Track tab activity (called when tab becomes active or is interacted with)
 */
export function trackTabActivity(tabId: string): void {
  const tabsState = useTabsStore.getState();
  const tab = tabsState.tabs.find(t => t.id === tabId);
  
  if (!tab) return;

  // Update last active timestamp
  tabsState.updateTab(tabId, { lastActiveAt: Date.now() });

  // Clear inactivity timer
  const existingTimer = inactivityTimers.get(tabId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    inactivityTimers.delete(tabId);
  }

  // If tab was sleeping, wake it up
  if (tab.sleeping) {
    wakeTab(tabId).catch(error => {
      console.warn('[HibernationManager] Failed to wake tab on activity:', error);
    });
  }
}

/**
 * Start monitoring tab inactivity
 */
export function startInactivityMonitoring(): void {
  const tabsState = useTabsStore.getState();
  const tabs = tabsState.tabs;
  const activeId = tabsState.activeId;

  // Clear existing timers
  inactivityTimers.forEach(timer => clearTimeout(timer));
  inactivityTimers.clear();

  // Set inactivity timers for inactive tabs
  tabs.forEach((tab) => {
    if (tab.id === activeId || tab.pinned || tab.sleeping) {
      return; // Skip active, pinned, or already sleeping tabs
    }

    const lastActive = tab.lastActiveAt || tab.createdAt || Date.now();
    const timeSinceActive = Date.now() - lastActive;
    const timeUntilHibernation = Math.max(0, INACTIVITY_TIMEOUT_MS - timeSinceActive);

    if (timeUntilHibernation === 0) {
      // Already inactive, hibernate immediately
      hibernateTab(tab.id).catch(console.error);
    } else {
      // Set timer for future hibernation
      const timer = setTimeout(() => {
        hibernateTab(tab.id).catch(console.error);
        inactivityTimers.delete(tab.id);
      }, timeUntilHibernation);

      inactivityTimers.set(tab.id, timer);
    }
  });
}

/**
 * Hibernate a specific tab (manual or automatic)
 */
export async function hibernateTab(tabId: string): Promise<void> {
  const tabsState = useTabsStore.getState();
  const tab = tabsState.tabs.find(t => t.id === tabId);

  if (!tab || tab.sleeping || tab.pinned) {
    return; // Already sleeping or pinned
  }

  try {
    // Save scroll position and state before hibernation
    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`) as HTMLIFrameElement;
    if (iframe) {
      saveScrollPosition(tabId, iframe);
      await createTabSnapshot(tabId, tab, iframe);
    }

    // Clear inactivity timer
    const timer = inactivityTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      inactivityTimers.delete(tabId);
    }

    // Mark as sleeping
    tabsState.updateTab(tabId, { sleeping: true });

    // Hibernate via IPC if available
    const { ipc } = await import('../../lib/ipc-typed');
    if (ipc?.tabs?.hibernate) {
      await ipc.tabs.hibernate(tabId);
    }

    console.log('[HibernationManager] Tab hibernated:', tabId, tab.title);
  } catch (error) {
    console.warn('[HibernationManager] Failed to hibernate tab:', tabId, error);
  }
}

/**
 * Wake up a hibernated tab
 */
export async function wakeTab(tabId: string): Promise<void> {
  const tabsState = useTabsStore.getState();
  const tab = tabsState.tabs.find(t => t.id === tabId);

  if (!tab || !tab.sleeping) {
    return; // Not sleeping
  }

  try {
    // Wake via IPC if available
    const { ipc } = await import('../../lib/ipc-typed');
    if (ipc?.tabs?.wake) {
      await ipc.tabs.wake(tabId);
    }

    // Mark as not sleeping
    tabsState.updateTab(tabId, { sleeping: false, lastActiveAt: Date.now() });

    // Restore scroll position after page loads
    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`) as HTMLIFrameElement;
    if (iframe) {
      // Wait for iframe to load
      const restoreWhenReady = () => {
        if (iframe.contentDocument?.readyState === 'complete') {
          setTimeout(() => {
            restoreScrollPosition(tabId, iframe);
          }, 100);
        } else {
          iframe.addEventListener('load', () => {
            setTimeout(() => {
              restoreScrollPosition(tabId, iframe);
            }, 100);
          }, { once: true });
        }
      };

      restoreWhenReady();
    }

    console.log('[HibernationManager] Tab woken:', tabId);
  } catch (error) {
    console.warn('[HibernationManager] Failed to wake tab:', tabId, error);
  }
}

/**
 * SPRINT 1: Create tab snapshot with thumbnail and state
 */
async function createTabSnapshot(tabId: string, tab: Tab, iframe: HTMLIFrameElement): Promise<void> {
  try {
    const snapshot = {
      tabId,
      url: tab.url || '',
      title: tab.title || '',
      timestamp: Date.now(),
      scrollPosition: null as HibernationState | null,
    };

    // Save scroll position
    const scrollState = saveScrollPosition(tabId, iframe);
    snapshot.scrollPosition = scrollState || null;

    // SPRINT 1: Generate lightweight thumbnail (simplified - would use canvas in production)
    // For now, we'll store minimal snapshot data
    const snapshotData = {
      ...snapshot,
      thumbnail: null, // Would be base64 image in production
    };

    // Store in IndexedDB
    await saveSnapshotToIndexedDB(snapshotData);

    console.log('[HibernationManager] Snapshot created for tab:', tabId);
  } catch (error) {
    console.warn('[HibernationManager] Failed to create snapshot:', error);
  }
}

/**
 * SPRINT 1: Save snapshot to IndexedDB
 */
async function saveSnapshotToIndexedDB(snapshot: any): Promise<void> {
  try {
    // Use Dexie or IndexedDB directly
    const dbName = 'regen-tab-snapshots';
    const dbVersion = 1;
    const storeName = 'snapshots';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const putRequest = store.put(snapshot, snapshot.tabId);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'tabId' });
        }
      };
    });
  } catch (error) {
    console.warn('[HibernationManager] IndexedDB not available:', error);
  }
}

/**
 * SPRINT 1: Get snapshot from IndexedDB
 */
export async function getTabSnapshot(tabId: string): Promise<any | null> {
  try {
    const dbName = 'regen-tab-snapshots';
    const storeName = 'snapshots';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(tabId);

        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  } catch (error) {
    console.warn('[HibernationManager] Failed to get snapshot:', error);
    return null;
  }
}

/**
 * Get count of hibernated tabs
 */
export function getHibernatedTabCount(): number {
  const tabsState = useTabsStore.getState();
  return tabsState.tabs.filter(tab => tab.sleeping).length;
}

/**
 * Wake all hibernated tabs
 */
export async function wakeAllHibernatedTabs(): Promise<number> {
  const tabsState = useTabsStore.getState();
  const hibernatedTabs = tabsState.tabs.filter(tab => tab.sleeping);

  let wokenCount = 0;
  for (const tab of hibernatedTabs) {
    try {
      await wakeTab(tab.id);
      wokenCount++;
    } catch (error) {
      console.warn('[HibernationManager] Failed to wake tab:', tab.id, error);
    }
  }

  return wokenCount;
}

/**
 * Initialize hibernation manager
 */
export function initializeHibernationManager(): () => void {
  // Start inactivity monitoring
  startInactivityMonitoring();

  // Subscribe to tab changes to update timers
  const unsubscribe = useTabsStore.subscribe(
    state => ({ tabs: state.tabs, activeId: state.activeId }),
    () => {
      startInactivityMonitoring();
    }
  );

  // Check periodically for tabs that should be hibernated
  const intervalId = setInterval(() => {
    startInactivityMonitoring();
  }, CHECK_INTERVAL_MS);

  // LAYER 1: Wire memory-triggered tab eviction
  // Listen for memory warning events and hibernate least-recently-used tabs
  const handleMemoryWarning = () => {
    console.warn('[HibernationManager] Memory warning received, hibernating LRU tabs');
    evictLRUTabs(2); // Hibernate 2 oldest tabs on warning
  };

  const handleMemoryExceeded = () => {
    console.error('[HibernationManager] Memory limit exceeded, aggressively hibernating tabs');
    evictLRUTabs(5); // Hibernate 5 oldest tabs on critical memory
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('memory-warning', handleMemoryWarning);
    window.addEventListener('memory-limit-exceeded', handleMemoryExceeded);
  }

  // Cleanup function
  return () => {
    unsubscribe();
    clearInterval(intervalId);
    inactivityTimers.forEach(timer => clearTimeout(timer));
    inactivityTimers.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('memory-warning', handleMemoryWarning);
      window.removeEventListener('memory-limit-exceeded', handleMemoryExceeded);
    }
  };
}

/**
 * LAYER 1: Evict (hibernate) least-recently-used tabs to free memory
 * @param count Number of tabs to hibernate
 */
export function evictLRUTabs(count: number): void {
  const tabsState = useTabsStore.getState();
  const { tabs, activeId } = tabsState;

  // Find eviction candidates: non-pinned, non-sleeping, non-active tabs sorted by lastActiveAt
  const candidates = tabs
    .filter(tab => !tab.pinned && !tab.sleeping && tab.id !== activeId)
    .sort((a, b) => {
      const aTime = a.lastActiveAt || a.createdAt || 0;
      const bTime = b.lastActiveAt || b.createdAt || 0;
      return aTime - bTime; // Oldest first
    });

  const toEvict = candidates.slice(0, count);
  console.log(`[HibernationManager] Evicting ${toEvict.length} tabs:`, toEvict.map(t => t.title));

  // Hibernate each candidate
  toEvict.forEach(tab => {
    hibernateTab(tab.id).catch(err => {
      console.warn('[HibernationManager] Failed to evict tab:', tab.id, err);
    });
  });
}

