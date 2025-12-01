/**
 * Tab Suspension Service - Advanced tab lifecycle management
 * Implements suspend/resume with IndexedDB snapshotting for memory optimization
 *
 * Tab States: active → idle → suspended → resumed
 */

import { useTabsStore } from '../state/tabsStore';

export type TabState = 'active' | 'idle' | 'suspended' | 'resumed';

interface TabSnapshot {
  tabId: string;
  url: string;
  title: string;
  html: string;
  scrollPosition: { x: number; y: number };
  timestamp: number;
}

// PR: Performance optimization - More aggressive hibernation to reduce lag
const IDLE_THRESHOLD_MS = 30000; // 30 seconds of inactivity (unchanged)
const SUSPEND_THRESHOLD_MS = 120000; // 2 minutes of inactivity (unchanged)
const BLUR_SUSPEND_DELAY_MS = 5000; // 5 seconds after blur to suspend (new)
const DB_NAME = 'regen-tab-snapshots';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

let db: IDBDatabase | null = null;
const tabStateMap = new Map<string, TabState>();
const lastActivityMap = new Map<string, number>();
const idleTimeouts = new Map<string, NodeJS.Timeout>();
const suspendTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Initialize IndexedDB for tab snapshots
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = event => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'tabId' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Save tab snapshot to IndexedDB
 */
export async function saveTabSnapshot(
  tabId: string,
  snapshot: Omit<TabSnapshot, 'tabId' | 'timestamp'>
): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const fullSnapshot: TabSnapshot = {
      tabId,
      timestamp: Date.now(),
      ...snapshot,
    };

    await store.put(fullSnapshot);
    console.log(`[TabSuspension] Saved snapshot for tab ${tabId}`);
  } catch (error) {
    console.error(`[TabSuspension] Failed to save snapshot for tab ${tabId}:`, error);
  }
}

/**
 * Load tab snapshot from IndexedDB
 */
export async function loadTabSnapshot(tabId: string): Promise<TabSnapshot | null> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(tabId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`[TabSuspension] Failed to load snapshot for tab ${tabId}:`, error);
    return null;
  }
}

/**
 * Delete tab snapshot from IndexedDB
 */
export async function deleteTabSnapshot(tabId: string): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await store.delete(tabId);
    console.log(`[TabSuspension] Deleted snapshot for tab ${tabId}`);
  } catch (error) {
    console.error(`[TabSuspension] Failed to delete snapshot for tab ${tabId}:`, error);
  }
}

/**
 * Mark tab as active (user interaction)
 */
export function markTabActive(tabId: string): void {
  const now = Date.now();
  lastActivityMap.set(tabId, now);
  tabStateMap.set(tabId, 'active');

  // Clear existing timeouts
  const idleTimeout = idleTimeouts.get(tabId);
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeouts.delete(tabId);
  }

  const suspendTimeout = suspendTimeouts.get(tabId);
  if (suspendTimeout) {
    clearTimeout(suspendTimeout);
    suspendTimeouts.delete(tabId);
  }

  // Schedule idle check
  scheduleIdleCheck(tabId);
}

/**
 * Schedule idle check for a tab
 */
function scheduleIdleCheck(tabId: string): void {
  const timeout = setTimeout(() => {
    markTabIdle(tabId);
  }, IDLE_THRESHOLD_MS);

  idleTimeouts.set(tabId, timeout);
}

/**
 * Mark tab as idle
 */
function markTabIdle(tabId: string): void {
  if (tabStateMap.get(tabId) === 'active') {
    tabStateMap.set(tabId, 'idle');
    console.log(`[TabSuspension] Tab ${tabId} marked as idle`);

    // Schedule suspend check
    const timeout = setTimeout(() => {
      suspendTab(tabId);
    }, SUSPEND_THRESHOLD_MS - IDLE_THRESHOLD_MS);

    suspendTimeouts.set(tabId, timeout);
  }
}

/**
 * Suspend a tab (unmount heavy components, save snapshot)
 */
async function suspendTab(tabId: string): Promise<void> {
  const tabs = useTabsStore.getState().tabs;
  const tab = tabs.find(t => t.id === tabId);

  if (!tab || tabStateMap.get(tabId) === 'suspended') {
    return;
  }

  console.log(`[TabSuspension] Suspending tab ${tabId}`);

  // Get tab content (if available)
  try {
    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`) as HTMLIFrameElement;
    let html = '';
    let scrollPosition = { x: 0, y: 0 };

    if (iframe && iframe.contentDocument) {
      html = iframe.contentDocument.documentElement.outerHTML;
      scrollPosition = {
        x: iframe.contentWindow?.scrollX || 0,
        y: iframe.contentWindow?.scrollY || 0,
      };
    }

    // Save snapshot
    await saveTabSnapshot(tabId, {
      url: tab.url || '',
      title: tab.title || '',
      html,
      scrollPosition,
    });

    // Mark as suspended
    tabStateMap.set(tabId, 'suspended');

    // Dispatch event for components to unmount
    window.dispatchEvent(
      new CustomEvent('tab:suspended', {
        detail: { tabId },
      })
    );
  } catch (error) {
    console.error(`[TabSuspension] Error suspending tab ${tabId}:`, error);
  }
}

/**
 * Resume a suspended tab
 */
export async function resumeTab(tabId: string): Promise<TabSnapshot | null> {
  if (tabStateMap.get(tabId) !== 'suspended') {
    return null;
  }

  console.log(`[TabSuspension] Resuming tab ${tabId}`);

  // Load snapshot
  const snapshot = await loadTabSnapshot(tabId);

  if (snapshot) {
    tabStateMap.set(tabId, 'resumed');
    markTabActive(tabId); // Reset activity tracking

    // Dispatch event for components to restore
    window.dispatchEvent(
      new CustomEvent('tab:resumed', {
        detail: { tabId, snapshot },
      })
    );
  }

  return snapshot;
}

/**
 * Get current tab state
 */
export function getTabState(tabId: string): TabState {
  return tabStateMap.get(tabId) || 'active';
}

/**
 * Check if tab is suspended
 */
export function isTabSuspended(tabId: string): boolean {
  return tabStateMap.get(tabId) === 'suspended';
}

/**
 * Cleanup: Remove all timeouts and clear state
 */
export function cleanupTabSuspension(tabId: string): void {
  const idleTimeout = idleTimeouts.get(tabId);
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeouts.delete(tabId);
  }

  const suspendTimeout = suspendTimeouts.get(tabId);
  if (suspendTimeout) {
    clearTimeout(suspendTimeout);
    suspendTimeouts.delete(tabId);
  }

  tabStateMap.delete(tabId);
  lastActivityMap.delete(tabId);
}

/**
 * Initialize tab suspension for a tab
 */
export function initTabSuspension(tabId: string): void {
  markTabActive(tabId);
}

/**
 * PR: Performance optimization - Suspend inactive tabs on window blur
 * Reduces memory usage when user switches away from the app
 */
export function setupBlurSuspension(): () => void {
  let blurTimeout: NodeJS.Timeout | null = null;
  let isBlurred = false;

  const handleBlur = () => {
    isBlurred = true;
    // Clear existing timeout
    if (blurTimeout) {
      clearTimeout(blurTimeout);
    }

    // Schedule suspension of inactive tabs after blur delay
    blurTimeout = setTimeout(async () => {
      if (!isBlurred) return; // Window might have regained focus

      const tabsState = useTabsStore.getState();
      const activeId = tabsState.activeId;

      // Suspend all inactive tabs
      for (const tab of tabsState.tabs) {
        if (tab.id !== activeId && !tab.pinned && tabStateMap.get(tab.id) === 'active') {
          console.log(`[TabSuspension] Suspending inactive tab on blur: ${tab.id}`);
          await suspendTab(tab.id);
        }
      }
    }, BLUR_SUSPEND_DELAY_MS);
  };

  const handleFocus = () => {
    isBlurred = false;
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }

    // Resume active tab if it was suspended
    const tabsState = useTabsStore.getState();
    const activeId = tabsState.activeId;
    if (activeId && tabStateMap.get(activeId) === 'suspended') {
      console.log(`[TabSuspension] Resuming active tab on focus: ${activeId}`);
      resumeTab(activeId);
    }
  };

  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);

  // Cleanup function
  return () => {
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    if (blurTimeout) {
      clearTimeout(blurTimeout);
    }
  };
}
