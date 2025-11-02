/**
 * Memory Monitoring
 * Track and enforce memory limits per tab
 */

import { app, BrowserView } from 'electron';

interface TabMemoryState {
  tabId: string;
  view: BrowserView;
  memoryMB: number;
  lastCheck: number;
}

const tabMemoryStates = new Map<string, TabMemoryState>();
let memoryCapMB = 2048; // Default from settings

const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

/**
 * Update memory cap from settings
 */
export function updateMemoryCap(capMB: number): void {
  memoryCapMB = capMB;
}

/**
 * Register a tab for memory monitoring
 */
export function registerTabMemory(tabId: string, view: BrowserView): void {
  const state: TabMemoryState = {
    tabId,
    view,
    memoryMB: 0,
    lastCheck: Date.now(),
  };
  
  tabMemoryStates.set(tabId, state);
  
  // Periodic memory check
  const interval = setInterval(() => {
    checkTabMemory(tabId);
  }, CHECK_INTERVAL_MS);
  
  // Store interval ID (would need cleanup on unregister)
  (view as any).__memoryCheckInterval = interval;
}

/**
 * Check memory for a tab and enforce cap
 */
export function checkTabMemory(tabId: string): number | null {
  const state = tabMemoryStates.get(tabId);
  if (!state || state.view.webContents.isDestroyed()) {
    return null;
  }
  
  // Get memory info (Electron API)
  const memInfo = process.memoryUsage();
  const heapUsedMB = memInfo.heapUsed / 1024 / 1024;
  
  // Estimate tab memory (this is approximate)
  // In real implementation, would use Chromium memory APIs if available
  state.memoryMB = heapUsedMB;
  state.lastCheck = Date.now();
  
  // If over cap, warn or take action
  if (state.memoryMB > memoryCapMB) {
    console.warn(`[Memory] Tab ${tabId} exceeded memory cap: ${state.memoryMB.toFixed(2)}MB > ${memoryCapMB}MB`);
    
    // Option: Auto-sleep tab
    // sleepTab(tabId); // Would need to import from tab-sleep
  }
  
  return state.memoryMB;
}

/**
 * Get memory usage for a tab
 */
export function getTabMemory(tabId: string): number | undefined {
  const state = tabMemoryStates.get(tabId);
  return state?.memoryMB;
}

/**
 * Unregister tab memory monitoring
 */
export function unregisterTabMemory(tabId: string): void {
  const state = tabMemoryStates.get(tabId);
  if (state?.view) {
    const interval = (state.view as any).__memoryCheckInterval;
    if (interval) {
      clearInterval(interval);
    }
  }
  tabMemoryStates.delete(tabId);
}

/**
 * Get total memory usage across all tabs
 */
export function getTotalMemoryUsage(): number {
  let total = 0;
  for (const state of tabMemoryStates.values()) {
    total += state.memoryMB;
  }
  return total;
}

