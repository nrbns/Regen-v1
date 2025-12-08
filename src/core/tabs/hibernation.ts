/**
 * Tab Hibernation - Enhanced memory management and scroll position preservation
 * Phase 1, Day 2: Hibernation & Performance improvements
 */

import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';

// Phase 1, Day 2: 4GB threshold for low-end devices
const MEMORY_THRESHOLD_4GB = 4 * 1024 * 1024 * 1024; // 4GB in bytes
const MEMORY_THRESHOLD_PERCENTAGE = 0.75; // 75% of available memory
const MAX_TABS_BEFORE_HIBERNATION = 15;

export interface HibernationState {
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  timestamp: number;
}

// Store scroll positions for hibernated tabs
const scrollPositions = new Map<string, HibernationState>();

/**
 * Phase 1, Day 2: Improved memory detection for 4GB devices
 */
export function shouldHibernateTabs(): boolean {
  // Check if we're in a browser environment
  if (typeof performance === 'undefined') {
    return false;
  }

  const memory = (performance as any).memory;
  if (!memory) {
    // Fallback: check tab count
    const tabs = useTabsStore.getState().tabs;
    return tabs.length > MAX_TABS_BEFORE_HIBERNATION;
  }

  // Check absolute memory (4GB threshold)
  const usedJSHeapSize = memory.usedJSHeapSize || 0;
  const jsHeapSizeLimit = memory.jsHeapSizeLimit || 0;

  // If we have heap size limit, check percentage
  if (jsHeapSizeLimit > 0) {
    const percentage = usedJSHeapSize / jsHeapSizeLimit;
    if (percentage >= MEMORY_THRESHOLD_PERCENTAGE) {
      return true;
    }
  }

  // Check absolute memory usage (for 4GB devices)
  // If used memory exceeds 3GB (75% of 4GB), hibernate
  if (usedJSHeapSize > MEMORY_THRESHOLD_4GB * 0.75) {
    return true;
  }

  return false;
}

/**
 * Phase 1, Day 2: Save scroll position before hibernation
 */
export function saveScrollPosition(tabId: string, iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;

  try {
    const win = iframe.contentWindow;
    if (!win) return;

    const state: HibernationState = {
      scrollX: win.scrollX || 0,
      scrollY: win.scrollY || 0,
      viewportWidth: win.innerWidth || 0,
      viewportHeight: win.innerHeight || 0,
      timestamp: Date.now(),
    };

    scrollPositions.set(tabId, state);
    console.log('[Hibernation] Saved scroll position for tab', tabId, state);
  } catch {
    // Cross-origin - can't access, that's okay
    console.log('[Hibernation] Cannot save scroll position (cross-origin)', tabId);
  }
}

/**
 * Phase 1, Day 2: Restore scroll position after reload
 */
export function restoreScrollPosition(tabId: string, iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;

  const savedState = scrollPositions.get(tabId);
  if (!savedState) return;

  try {
    const win = iframe.contentWindow;
    if (!win) return;

    // Wait for page to load
    const restore = () => {
      try {
        win.scrollTo(savedState.scrollX, savedState.scrollY);
        console.log('[Hibernation] Restored scroll position for tab', tabId, savedState);
      } catch (error) {
        console.warn('[Hibernation] Failed to restore scroll position', tabId, error);
      }
    };

    // Try immediately
    restore();

    // Also try after a short delay (in case page is still loading)
    setTimeout(restore, 100);
    setTimeout(restore, 500);
  } catch {
    // Cross-origin - can't access
    console.log('[Hibernation] Cannot restore scroll position (cross-origin)', tabId);
  }
}

/**
 * Phase 1, Day 2: Clear scroll position when tab is closed
 */
export function clearScrollPosition(tabId: string): void {
  scrollPositions.delete(tabId);
}

/**
 * Phase 1, Day 2: Get hibernation state for a tab
 */
export function getHibernationState(tabId: string): HibernationState | null {
  return scrollPositions.get(tabId) || null;
}

/**
 * Phase 1, Day 2: Hibernate inactive tabs based on memory threshold
 */
export async function hibernateInactiveTabs(): Promise<number> {
  if (!shouldHibernateTabs()) {
    return 0;
  }

  const tabsState = useTabsStore.getState();
  const tabs = tabsState.tabs;
  const activeId = tabsState.activeId;

  // Find inactive tabs (not active, not pinned, not already sleeping)
  const inactiveTabs = tabs
    .filter(tab => tab.id !== activeId && !tab.pinned && !tab.sleeping)
    .sort((a, b) => (a.lastActiveAt || 0) - (b.lastActiveAt || 0)); // Oldest first

  if (inactiveTabs.length === 0) {
    return 0;
  }

  // Hibernate up to 3 oldest inactive tabs
  const tabsToHibernate = inactiveTabs.slice(0, 3);
  let hibernatedCount = 0;

  for (const tab of tabsToHibernate) {
    try {
      // Save scroll position before hibernating
      const iframe = document.querySelector(`iframe[data-tab-id="${tab.id}"]`) as HTMLIFrameElement;
      if (iframe) {
        saveScrollPosition(tab.id, iframe);
      }

      // Hibernate via IPC
      if (ipc?.tabs?.hibernate) {
        await ipc.tabs.hibernate(tab.id);
      }

      // Mark as sleeping
      useTabsStore.getState().updateTab(tab.id, { sleeping: true });
      hibernatedCount++;

      console.log('[Hibernation] Hibernated tab', tab.id, tab.title);
    } catch (error) {
      console.warn('[Hibernation] Failed to hibernate tab', tab.id, error);
    }
  }

  return hibernatedCount;
}

/**
 * Phase 1, Day 2: Wake up a hibernated tab and restore scroll position
 */
export async function wakeTab(tabId: string, iframe: HTMLIFrameElement | null): Promise<void> {
  try {
    // Wake via IPC
    if (ipc?.tabs?.wake) {
      await ipc.tabs.wake(tabId);
    }

    // Mark as not sleeping
    useTabsStore.getState().updateTab(tabId, { sleeping: false });

    // Restore scroll position after a delay (to allow page to load)
    if (iframe) {
      iframe.addEventListener(
        'load',
        () => {
          setTimeout(() => {
            restoreScrollPosition(tabId, iframe);
          }, 100);
        },
        { once: true }
      );

      // Also try immediately if iframe is already loaded
      if (iframe.contentDocument?.readyState === 'complete') {
        setTimeout(() => {
          restoreScrollPosition(tabId, iframe);
        }, 100);
      }
    }

    console.log('[Hibernation] Woke up tab', tabId);
  } catch (error) {
    console.warn('[Hibernation] Failed to wake tab', tabId, error);
  }
}

