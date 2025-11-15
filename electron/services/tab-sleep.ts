/**
 * Tab Sleep Management
 * Auto-discard tabs after idle period and manage memory
 */

import { BrowserView } from 'electron';

interface TabSleepState {
  tabId: string;
  view: BrowserView;
  lastActive: number;
  isSleeping: boolean;
  memoryMB?: number;
  memoryCapMB?: number; // Memory cap for this tab (default: 500MB)
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
      scheduleSleep(tabId);
    }
  }
}

/**
 * Register a tab for sleep management
 */
export function registerTab(tabId: string, view: BrowserView, memoryCapMB?: number): void {
  const state: TabSleepState = {
    tabId,
    view,
    lastActive: Date.now(),
    isSleeping: false,
    memoryCapMB: memoryCapMB ?? 500, // Default 500MB cap
  };
  
  sleepingTabs.set(tabId, state);
  scheduleSleep(tabId);
  
  // Track memory usage periodically
  const memoryCheckInterval = setInterval(async () => {
    try {
      if (view.webContents.isDestroyed()) {
        clearInterval(memoryCheckInterval);
        return;
      }
      
      // Get memory usage (if available)
      if (view.webContents && typeof (view.webContents as any).getProcessMemoryInfo === 'function') {
        try {
          const memInfo = await (view.webContents as any).getProcessMemoryInfo();
          const memoryMB = Math.round((memInfo.private || 0) / 1024);
          state.memoryMB = memoryMB;
          
          // Check if memory cap exceeded
          if (state.memoryCapMB && memoryMB > state.memoryCapMB) {
            console.warn(`[TabSleep] Tab ${tabId} exceeded memory cap (${memoryMB}MB > ${state.memoryCapMB}MB)`);
            // Auto-suspend if memory cap exceeded
            if (!state.isSleeping) {
              sleepTab(tabId);
            }
          }
        } catch {
          // Memory info not available, skip
        }
      }
    } catch {
      // Tab destroyed or error, clear interval
      clearInterval(memoryCheckInterval);
    }
  }, 30000); // Check every 30 seconds
  
  // Clean up interval when tab is unregistered
  view.webContents.once('destroyed', () => {
    clearInterval(memoryCheckInterval);
  });
  
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
  scheduleSleep(tabId);
}

/**
 * Schedule sleep for a tab
 */
function scheduleSleep(tabId: string): void {
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
 * Get memory cap for a tab
 */
export function getTabMemoryCap(tabId: string): number | undefined {
  const state = sleepingTabs.get(tabId);
  return state?.memoryCapMB;
}

/**
 * Set memory cap for a tab
 */
export function setTabMemoryCap(tabId: string, capMB: number): void {
  const state = sleepingTabs.get(tabId);
  if (state) {
    state.memoryCapMB = capMB;
  }
}

/**
 * Check if tab is sleeping
 */
export function isTabSleeping(tabId: string): boolean {
  const state = sleepingTabs.get(tabId);
  return state?.isSleeping || false;
}

