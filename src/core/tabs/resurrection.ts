/**
 * Tab Resurrection System
 * Auto-saves tabs before crash and restores them on restart
 */

import { useTabsStore, type Tab } from '../../state/tabsStore';

export interface ResurrectableTab {
  id: string;
  title: string;
  url?: string;
  appMode?: Tab['appMode'];
  mode?: Tab['mode'];
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  groupId?: string;
  history?: Tab['history'];
  historyIndex?: number;
  savedAt: number;
  crashReason?: string;
}

const RESURRECTION_KEY = 'regen:tabs:resurrection';
const RESURRECTION_DELAY_MS = 300000; // Auto-resurrect after 5 minutes (300000ms)
const MAX_RESURRECTABLE_TABS = 20;

/**
 * Save tab for resurrection
 */
export function saveTabForResurrection(tab: Tab, crashReason?: string): void {
  try {
    const existing = loadResurrectableTabs();
    const resurrectable: ResurrectableTab = {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      appMode: tab.appMode,
      mode: tab.mode,
      containerId: tab.containerId,
      containerName: tab.containerName,
      containerColor: tab.containerColor,
      groupId: tab.groupId,
      history: tab.history,
      historyIndex: tab.historyIndex,
      savedAt: Date.now(),
      crashReason,
    };

    // Remove if already exists and add to front
    const filtered = existing.filter(t => t.id !== tab.id);
    const updated = [resurrectable, ...filtered].slice(0, MAX_RESURRECTABLE_TABS);

    localStorage.setItem(RESURRECTION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[TabResurrection] Failed to save tab:', error);
  }
}

/**
 * Load all resurrectable tabs
 */
export function loadResurrectableTabs(): ResurrectableTab[] {
  try {
    const raw = localStorage.getItem(RESURRECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[TabResurrection] Failed to load resurrectable tabs:', error);
    return [];
  }
}

/**
 * Resurrect a tab
 */
export async function resurrectTab(resurrectable: ResurrectableTab): Promise<boolean> {
  try {
    const { ipc } = await import('../../lib/ipc-typed');
    const tabsStore = useTabsStore.getState();

    // Create the tab
    const result = await ipc.tabs.create({
      url: resurrectable.url || 'about:blank',
      containerId: resurrectable.containerId || undefined,
    });

    const newId =
      typeof result === 'object' && result && 'id' in result ? String(result.id) : String(result);

    // Update tab with saved data
    setTimeout(() => {
      tabsStore.updateTab(newId, {
        appMode: resurrectable.appMode,
        containerId: resurrectable.containerId,
        containerName: resurrectable.containerName,
        containerColor: resurrectable.containerColor,
        mode: resurrectable.mode,
        title: resurrectable.title,
        url: resurrectable.url,
        history: resurrectable.history,
        historyIndex: resurrectable.historyIndex,
      });
      tabsStore.setActive(newId);
    }, 75);

    // Remove from resurrection list
    deleteResurrectableTab(resurrectable.id);

    return true;
  } catch (error) {
    console.error('[TabResurrection] Failed to resurrect tab:', error);
    return false;
  }
}

/**
 * Delete a resurrectable tab
 */
export function deleteResurrectableTab(tabId: string): void {
  try {
    const all = loadResurrectableTabs();
    const filtered = all.filter(t => t.id !== tabId);
    localStorage.setItem(RESURRECTION_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('[TabResurrection] Failed to delete resurrectable tab:', error);
  }
}

/**
 * Auto-save all tabs periodically for resurrection
 */
let saveInterval: NodeJS.Timeout | null = null;

export function startAutoSaveTabs(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
  }

  saveInterval = setInterval(() => {
    const tabs = useTabsStore.getState().tabs;
    tabs.forEach(tab => {
      // Only save active tabs that have been open for a while
      if (tab.url && tab.url !== 'about:blank' && !tab.url.startsWith('chrome://')) {
        saveTabForResurrection(tab);
      }
    });
  }, 30000); // Save every 30 seconds
}

export function stopAutoSaveTabs(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

/**
 * Check for tabs to resurrect on app start
 */
export function checkForResurrectableTabs(): ResurrectableTab[] {
  const all = loadResurrectableTabs();
  const now = Date.now();
  const RESURRECTION_WINDOW_MS = 300000; // 5 minutes

  // Filter tabs that were saved recently (likely crashed)
  return all.filter(tab => {
    const timeSinceSave = now - tab.savedAt;
    return timeSinceSave < RESURRECTION_WINDOW_MS;
  });
}

/**
 * Auto-resurrect tabs after delay
 */
export function scheduleAutoResurrection(delayMs: number = RESURRECTION_DELAY_MS): void {
  setTimeout(() => {
    const toResurrect = checkForResurrectableTabs();
    if (toResurrect.length > 0) {
      console.log(`[TabResurrection] Auto-resurrecting ${toResurrect.length} tabs`);
      toResurrect.forEach(tab => {
        resurrectTab(tab).catch(err => {
          console.error('[TabResurrection] Failed to auto-resurrect:', err);
        });
      });
    }
  }, delayMs);
}
