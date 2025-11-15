/**
 * Tab Engine - Enhanced tab management with suspend/resume, memory caps, CPU monitoring, and crash recovery
 */

import { BrowserView } from 'electron';
import { sleepTab, wakeTab, setTabMemoryCap } from './tab-sleep';

export interface TabMetrics {
  memoryMB: number;
  cpuPercent: number;
  isActive: boolean;
  isBackground: boolean;
  lastActive: number;
  crashCount: number;
  lastCrashTime?: number;
}

export interface TabEngineState {
  tabId: string;
  view: BrowserView;
  metrics: TabMetrics;
  memoryCapMB: number;
  isSuspended: boolean;
  suspendedAt?: number;
  suspendedUrl?: string;
  suspendedTitle?: string;
  backgroundThrottleLevel: number; // 0 = no throttle, 1-5 = increasing throttle
  crashRecoveryEnabled: boolean;
}

const tabStates = new Map<string, TabEngineState>();
const cpuMonitoringIntervals = new Map<string, NodeJS.Timeout>();
const memoryMonitoringIntervals = new Map<string, NodeJS.Timeout>();
const backgroundThrottleIntervals = new Map<string, NodeJS.Timeout>();

// Defaults from settings
let defaultMemoryCapMB = 500;
let _defaultSleepMins = 20; // Reserved for future use
let enableBackgroundThrottling = true;
let enableCrashRecovery = true;

/**
 * Update defaults from settings
 */
export function updateDefaults(config: {
  memoryCapMB?: number;
  sleepMins?: number;
  backgroundThrottling?: boolean;
  crashRecovery?: boolean;
}): void {
  if (config.memoryCapMB !== undefined) defaultMemoryCapMB = config.memoryCapMB;
  if (config.sleepMins !== undefined) _defaultSleepMins = config.sleepMins;
  if (config.backgroundThrottling !== undefined) enableBackgroundThrottling = config.backgroundThrottling;
  if (config.crashRecovery !== undefined) enableCrashRecovery = config.crashRecovery;
}

/**
 * Initialize tab engine for a tab
 */
export function initTabEngine(
  tabId: string,
  view: BrowserView,
  options: {
    memoryCapMB?: number;
    crashRecovery?: boolean;
  } = {}
): void {
  const state: TabEngineState = {
    tabId,
    view,
    metrics: {
      memoryMB: 0,
      cpuPercent: 0,
      isActive: false,
      isBackground: true,
      lastActive: Date.now(),
      crashCount: 0,
    },
    memoryCapMB: options.memoryCapMB ?? defaultMemoryCapMB,
    isSuspended: false,
    backgroundThrottleLevel: 0,
    crashRecoveryEnabled: options.crashRecovery ?? enableCrashRecovery,
  };

  tabStates.set(tabId, state);
  setTabMemoryCap(tabId, state.memoryCapMB);

  // Start monitoring
  startMemoryMonitoring(tabId);
  startCPUMonitoring(tabId);

  // Setup crash recovery
  if (state.crashRecoveryEnabled) {
    setupCrashRecovery(tabId, view);
  }

  // Setup background throttling
  if (enableBackgroundThrottling) {
    setupBackgroundThrottling(tabId, view);
  }
}

/**
 * Start memory monitoring for a tab
 */
function startMemoryMonitoring(tabId: string): void {
  const state = tabStates.get(tabId);
  if (!state) return;

  const interval = setInterval(async () => {
    try {
      if (state.view.webContents.isDestroyed()) {
        clearInterval(interval);
        memoryMonitoringIntervals.delete(tabId);
        return;
      }

      // Get process memory info
      if (state.view.webContents && typeof (state.view.webContents as any).getProcessMemoryInfo === 'function') {
        try {
          const memInfo = await (state.view.webContents as any).getProcessMemoryInfo();
          const memoryMB = Math.round((memInfo.private || memInfo.residentSet || 0) / 1024);
          state.metrics.memoryMB = memoryMB;

          // Check memory cap
          if (memoryMB > state.memoryCapMB && !state.isSuspended) {
            console.warn(`[TabEngine] Tab ${tabId} exceeded memory cap (${memoryMB}MB > ${state.memoryCapMB}MB), suspending...`);
            suspendTab(tabId);
          }
        } catch {
          // Memory info not available
        }
      }
    } catch (err) {
      console.warn(`[TabEngine] Memory monitoring error for tab ${tabId}:`, err);
    }
  }, 30000); // Check every 30 seconds

  memoryMonitoringIntervals.set(tabId, interval);
}

/**
 * Start CPU monitoring for a tab
 */
function startCPUMonitoring(tabId: string): void {
  const state = tabStates.get(tabId);
  if (!state) return;

  let lastCpuTime = process.cpuUsage();
  let lastCheckTime = Date.now();

  const interval = setInterval(async () => {
    try {
      if (state.view.webContents.isDestroyed()) {
        clearInterval(interval);
        cpuMonitoringIntervals.delete(tabId);
        return;
      }

      // Get CPU usage (approximate)
      const currentCpuTime = process.cpuUsage();
      const currentTime = Date.now();
      const timeDelta = currentTime - lastCheckTime;
      
      if (timeDelta > 0) {
        const userDelta = currentCpuTime.user - lastCpuTime.user;
        const systemDelta = currentCpuTime.system - lastCpuTime.system;
        const totalDelta = (userDelta + systemDelta) / 1000; // Convert to milliseconds
        const cpuPercent = Math.min(100, (totalDelta / timeDelta) * 100);
        
        state.metrics.cpuPercent = cpuPercent;
        
        // If CPU usage is high and tab is background, consider throttling
        if (state.metrics.isBackground && cpuPercent > 50 && state.backgroundThrottleLevel < 5) {
          increaseThrottleLevel(tabId);
        }
      }

      lastCpuTime = currentCpuTime;
      lastCheckTime = currentTime;
    } catch (err) {
      console.warn(`[TabEngine] CPU monitoring error for tab ${tabId}:`, err);
    }
  }, 5000); // Check every 5 seconds

  cpuMonitoringIntervals.set(tabId, interval);
}

/**
 * Setup crash recovery for a tab
 */
function setupCrashRecovery(tabId: string, view: BrowserView): void {
  const state = tabStates.get(tabId);
  if (!state) return;

  // Listen for renderer process crashes
  view.webContents.on('render-process-gone', async (event, details) => {
    state.metrics.crashCount++;
    state.metrics.lastCrashTime = Date.now();
    
    console.warn(`[TabEngine] Tab ${tabId} crashed (reason: ${details.reason}), attempting recovery...`);
    
    // Attempt recovery
    if (details.reason === 'crashed' || details.reason === 'killed') {
      try {
        // Reload the page
        const url = state.suspendedUrl || view.webContents.getURL() || 'about:blank';
        if (url && url !== 'about:blank') {
          view.webContents.reload();
          console.log(`[TabEngine] Tab ${tabId} recovered, reloaded ${url}`);
        }
      } catch (err) {
        console.error(`[TabEngine] Failed to recover tab ${tabId}:`, err);
      }
    }
  });

  // Listen for unresponsive renderer
  view.webContents.on('unresponsive', () => {
    console.warn(`[TabEngine] Tab ${tabId} became unresponsive`);
    // Optionally suspend the tab
    if (state.metrics.isBackground) {
      suspendTab(tabId);
    }
  });

  view.webContents.on('responsive', () => {
    console.log(`[TabEngine] Tab ${tabId} became responsive again`);
  });
}

/**
 * Setup background throttling for a tab
 */
function setupBackgroundThrottling(tabId: string, view: BrowserView): void {
  const state = tabStates.get(tabId);
  if (!state) return;

  // Throttle background tabs by reducing update frequency
  const updateThrottle = () => {
    if (!state.metrics.isBackground || state.isSuspended) return;

    // Apply throttling based on level
    const throttleMs = state.backgroundThrottleLevel * 1000; // 1s per level
    
    if (throttleMs > 0) {
      // Reduce frame rate for background tabs
      try {
        view.webContents.setFrameRate(state.backgroundThrottleLevel > 3 ? 1 : 10);
      } catch {
        // Frame rate setting not available
      }
    }
  };

  const interval = setInterval(() => {
    if (state.view.webContents.isDestroyed()) {
      clearInterval(interval);
      backgroundThrottleIntervals.delete(tabId);
      return;
    }
    updateThrottle();
  }, 5000); // Update throttle every 5 seconds

  backgroundThrottleIntervals.set(tabId, interval);
}

/**
 * Suspend a tab (freeze it)
 */
export function suspendTab(tabId: string): boolean {
  const state = tabStates.get(tabId);
  if (!state || state.isSuspended) return false;

  try {
    // Store current state
    state.suspendedUrl = state.view.webContents.getURL();
    state.suspendedTitle = state.view.webContents.getTitle();
    state.suspendedAt = Date.now();

    // Stop the tab
    state.view.webContents.stop();
    
    // Use tab-sleep service
    sleepTab(tabId);
    
    state.isSuspended = true;
    state.backgroundThrottleLevel = 5; // Max throttle when suspended

    console.log(`[TabEngine] Tab ${tabId} suspended (URL: ${state.suspendedUrl})`);
    return true;
  } catch (err) {
    console.error(`[TabEngine] Failed to suspend tab ${tabId}:`, err);
    return false;
  }
}

/**
 * Revive a tab (restore it)
 */
export function reviveTab(tabId: string): boolean {
  const state = tabStates.get(tabId);
  if (!state || !state.isSuspended) return false;

  try {
    // Restore the tab
    const url = state.suspendedUrl || 'about:blank';
    if (url && url !== 'about:blank') {
      state.view.webContents.loadURL(url);
    }

    // Wake the tab
    wakeTab(tabId);
    
    state.isSuspended = false;
    state.backgroundThrottleLevel = 0;
    state.metrics.isActive = true;
    state.metrics.isBackground = false;
    state.metrics.lastActive = Date.now();

    // Reset frame rate
    try {
      state.view.webContents.setFrameRate(60);
    } catch {
      // Frame rate setting not available
    }

    console.log(`[TabEngine] Tab ${tabId} revived (URL: ${url})`);
    return true;
  } catch (error) {
    console.error(`[TabEngine] Failed to revive tab ${tabId}:`, error);
    return false;
  }
}

/**
 * Mark tab as active
 */
export function setTabActive(tabId: string, isActive: boolean): void {
  const state = tabStates.get(tabId);
  if (!state) return;

  state.metrics.isActive = isActive;
  state.metrics.isBackground = !isActive;
  state.metrics.lastActive = Date.now();

  if (isActive) {
    // Revive if suspended
    if (state.isSuspended) {
      reviveTab(tabId);
    }
    // Reset throttle
    state.backgroundThrottleLevel = 0;
    try {
      state.view.webContents.setFrameRate(60);
    } catch {
      // Frame rate setting not available
    }
  } else {
    // Start throttling background tab
    if (enableBackgroundThrottling && !state.isSuspended) {
      increaseThrottleLevel(tabId);
    }
  }
}

/**
 * Increase throttle level for background tab
 */
function increaseThrottleLevel(tabId: string): void {
  const state = tabStates.get(tabId);
  if (!state || state.metrics.isActive) return;

  if (state.backgroundThrottleLevel < 5) {
    state.backgroundThrottleLevel++;
    console.log(`[TabEngine] Increased throttle level for background tab ${tabId} to ${state.backgroundThrottleLevel}`);
  }
}

/**
 * Get tab metrics
 */
export function getTabMetrics(tabId: string): TabMetrics | null {
  const state = tabStates.get(tabId);
  return state?.metrics || null;
}

/**
 * Get tab engine state
 */
export function getTabState(tabId: string): TabEngineState | null {
  return tabStates.get(tabId) || null;
}

/**
 * Set memory cap for a tab
 */
export function setMemoryCap(tabId: string, capMB: number): void {
  const state = tabStates.get(tabId);
  if (state) {
    state.memoryCapMB = capMB;
    setTabMemoryCap(tabId, capMB);
  }
}

/**
 * Clean up tab engine (when tab is closed)
 */
export function cleanupTabEngine(tabId: string): void {
  // Clear intervals
  const cpuInterval = cpuMonitoringIntervals.get(tabId);
  if (cpuInterval) {
    clearInterval(cpuInterval);
    cpuMonitoringIntervals.delete(tabId);
  }

  const memoryInterval = memoryMonitoringIntervals.get(tabId);
  if (memoryInterval) {
    clearInterval(memoryInterval);
    memoryMonitoringIntervals.delete(tabId);
  }

  const throttleInterval = backgroundThrottleIntervals.get(tabId);
  if (throttleInterval) {
    clearInterval(throttleInterval);
    backgroundThrottleIntervals.delete(tabId);
  }

  // Remove state
  tabStates.delete(tabId);
}

/**
 * Get all tab metrics (for monitoring dashboard)
 */
export function getAllTabMetrics(): Map<string, TabMetrics> {
  const metrics = new Map<string, TabMetrics>();
  for (const [tabId, state] of tabStates.entries()) {
    metrics.set(tabId, state.metrics);
  }
  return metrics;
}

