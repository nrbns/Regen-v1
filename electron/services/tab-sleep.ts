/**
 * Tab Sleep Management
 * Auto-discard tabs after idle period and manage memory
 */

import { BrowserView } from 'electron';
import { SettingsSchema } from '../shared/settings/schema';

interface TabSleepState {
  tabId: string;
  view: BrowserView;
  lastActive: number;
  isSleeping: boolean;
  memoryMB?: number;
}

const sleepingTabs = new Map<string, TabSleepState>();
const tabTimers = new Map<string, NodeJS.Timeout>();

let defaultSleepMins = 20; // Default from settings

/**
 * Update sleep timeout from settings
 */
export function updateSleepTimeout(sleepMins: number): void {
  defaultSleepMins = sleepMins;
  // Restart timers for all tabs
  for (const [tabId, state] of sleepingTabs.entries()) {
    if (!state.isSleeping) {
      scheduleSleep(tabId, state);
    }
  }
}

/**
 * Register a tab for sleep management
 */
export function registerTab(tabId: string, view: BrowserView): void {
  const state: TabSleepState = {
    tabId,
    view,
    lastActive: Date.now(),
    isSleeping: false,
  };
  
  sleepingTabs.set(tabId, state);
  scheduleSleep(tabId, state);
  
  // Track activity
  view.webContents.on('did-navigate', () => {
    wakeTab(tabId);
  });
  
  view.webContents.on('page-title-updated', () => {
    wakeTab(tabId);
  });
}

/**
 * Wake a tab (reset sleep timer)
 */
export function wakeTab(tabId: string): void {
  const state = sleepingTabs.get(tabId);
  if (!state) return;
  
  state.lastActive = Date.now();
  state.isSleeping = false;
  
  // Cancel existing timer
  const timer = tabTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    tabTimers.delete(tabId);
  }
  
  // If tab was sleeping, reload
  if (state.isSleeping && !state.view.webContents.isDestroyed()) {
    const url = state.view.webContents.getURL();
    if (url && url !== 'about:blank') {
      state.view.webContents.reload();
    }
  }
  
  state.isSleeping = false;
  scheduleSleep(tabId, state);
}

/**
 * Schedule sleep for a tab
 */
function scheduleSleep(tabId: string, state: TabSleepState): void {
  const timer = tabTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
  }
  
  const timeoutMs = defaultSleepMins * 60 * 1000;
  const newTimer = setTimeout(() => {
    sleepTab(tabId);
  }, timeoutMs);
  
  tabTimers.set(tabId, newTimer);
}

/**
 * Put a tab to sleep (discard)
 */
export function sleepTab(tabId: string): void {
  const state = sleepingTabs.get(tabId);
  if (!state || state.isSleeping) return;
  
  if (!state.view.webContents.isDestroyed()) {
    // Store current URL
    const url = state.view.webContents.getURL();
    state.view.webContents.stop();
    
    // Discard the webContents (memory optimization)
    // Note: In Electron, we can't fully discard, but we can stop loading
    state.isSleeping = true;
    
    console.log(`[TabSleep] Tab ${tabId} put to sleep (URL: ${url})`);
  }
}

/**
 * Manually hibernate a tab
 */
export function hibernateTab(tabId: string): void {
  sleepTab(tabId);
}

/**
 * Unregister a tab (when closed)
 */
export function unregisterTab(tabId: string): void {
  const timer = tabTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    tabTimers.delete(tabId);
  }
  sleepingTabs.delete(tabId);
}

/**
 * Get memory usage for a tab (estimated)
 */
export function getTabMemory(tabId: string): number | undefined {
  const state = sleepingTabs.get(tabId);
  return state?.memoryMB;
}

/**
 * Check if tab is sleeping
 */
export function isTabSleeping(tabId: string): boolean {
  const state = sleepingTabs.get(tabId);
  return state?.isSleeping || false;
}

