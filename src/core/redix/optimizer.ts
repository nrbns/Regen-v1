/**
 * Redix Resource Optimizer
 * Manages tab suspension, throttling, and resource allocation
 */

import { Redix, dispatch } from './runtime';
import { ipc } from '../../lib/ipc-typed';
import { initializeMemoryPool } from './memory-pool';

export interface ResourcePolicy {
  suspendBackgroundTabs: boolean;
  suspendAfterMinutes: number;
  throttleHeavyTabs: boolean;
  memoryThreshold: number; // 0-100 percentage
  cpuThreshold: number; // 0-100 percentage
  batteryThreshold: number; // 0-100 percentage
  prefetchEnabled: boolean;
  prefetchOnWifiOnly: boolean;
}

const DEFAULT_POLICY: ResourcePolicy = {
  suspendBackgroundTabs: true,
  suspendAfterMinutes: 12,
  throttleHeavyTabs: true,
  memoryThreshold: 70,
  cpuThreshold: 80,
  batteryThreshold: 20,
  prefetchEnabled: true,
  prefetchOnWifiOnly: true,
};

let currentPolicy: ResourcePolicy = { ...DEFAULT_POLICY };
let suspendedTabs: Set<string> = new Set();
let heavyTabs: Set<string> = new Set();

/**
 * Load policy from storage or use default
 */
export async function loadPolicy(): Promise<ResourcePolicy> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('redix:policy');
      if (stored) {
        currentPolicy = { ...DEFAULT_POLICY, ...JSON.parse(stored) };
      }
    }
  } catch (error) {
    console.warn('[Redix] Failed to load policy:', error);
  }
  return currentPolicy;
}

/**
 * Save policy to storage
 */
export function savePolicy(policy: Partial<ResourcePolicy>): void {
  currentPolicy = { ...currentPolicy, ...policy };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('redix:policy', JSON.stringify(currentPolicy));
      dispatch({
        type: 'redix:policy:update',
        payload: currentPolicy,
      });
    }
  } catch (error) {
    console.error('[Redix] Failed to save policy:', error);
  }
}

/**
 * Get current policy
 */
export function getPolicy(): ResourcePolicy {
  return { ...currentPolicy };
}

/**
 * Suspend a tab (hibernate it to save resources)
 */
export async function suspendTab(tabId: string): Promise<void> {
  if (suspendedTabs.has(tabId)) return;

  try {
    // Mark as suspended
    suspendedTabs.add(tabId);

    // Notify Redix
    dispatch({
      type: 'redix:tab:suspend',
      payload: { tabId },
    });

    // Try to hibernate via IPC (if available)
    try {
      if (typeof ipc !== 'undefined' && ipc?.tabs?.wake) {
        await ipc.tabs.wake(tabId);
      }
    } catch {
      // IPC might not be available, continue
    }
  } catch (error) {
    console.error('[Redix] Failed to suspend tab:', error);
    suspendedTabs.delete(tabId);
  }
}

/**
 * Thaw (restore) a suspended tab
 */
export async function thawTab(tabId: string): Promise<void> {
  if (!suspendedTabs.has(tabId)) return;

  try {
    suspendedTabs.delete(tabId);

    dispatch({
      type: 'redix:tab:thaw',
      payload: { tabId },
    });

    // Try to wake via IPC
    try {
      if (typeof ipc !== 'undefined' && ipc?.tabs?.wake) {
        await ipc.tabs.wake(tabId);
      }
    } catch {
      // IPC might not be available, continue
    }
  } catch (error) {
    console.error('[Redix] Failed to thaw tab:', error);
  }
}

/**
 * Mark a tab as heavy (CPU/memory intensive)
 */
export function markTabHeavy(tabId: string, heavy: boolean): void {
  if (heavy) {
    heavyTabs.add(tabId);
    dispatch({
      type: 'redix:tab:heavy',
      payload: { tabId },
    });
  } else {
    heavyTabs.delete(tabId);
    dispatch({
      type: 'redix:tab:light',
      payload: { tabId },
    });
  }
}

/**
 * Check if tab is suspended
 */
export function isTabSuspended(tabId: string): boolean {
  return suspendedTabs.has(tabId);
}

/**
 * Check if tab is marked as heavy
 */
export function isTabHeavy(tabId: string): boolean {
  return heavyTabs.has(tabId);
}

/**
 * Optimize performance based on current policy and system state
 */
export async function optimizePerformance(metrics?: {
  memoryUsage?: number;
  cpuUsage?: number;
  batteryLevel?: number;
}): Promise<void> {
  const policy = getPolicy();

  // Check if we should suspend background tabs
  if (policy.suspendBackgroundTabs) {
    try {
      // Check if IPC is available
      if (typeof ipc === 'undefined' || !ipc?.tabs?.list) {
        return; // IPC not available, skip optimization
      }

      const tabs = await ipc.tabs.list();
      if (!Array.isArray(tabs) || tabs.length === 0) {
        return; // No tabs to optimize
      }

      const activeTab = tabs.find((t: any) => t.active);
      const activeId = activeTab?.id;

      for (const tab of tabs) {
        if (tab.id === activeId) continue;
        if (tab.url?.startsWith('about:') || tab.url?.startsWith('chrome:')) continue;

        // Check if tab should be suspended
        const lastActive = tab.lastActiveAt || tab.createdAt || 0;
        const minutesSinceActive = (Date.now() - lastActive) / (1000 * 60);

        if (minutesSinceActive > policy.suspendAfterMinutes) {
          await suspendTab(tab.id);
        }
      }
    } catch (error) {
      console.warn('[Redix] Failed to optimize tabs:', error);
    }
  }

  // Check memory threshold
  if (metrics?.memoryUsage && metrics.memoryUsage > policy.memoryThreshold) {
    dispatch({
      type: 'redix:performance:low',
      payload: { reason: 'memory', usage: metrics.memoryUsage },
    });
  }

  // Check CPU threshold
  if (metrics?.cpuUsage && metrics.cpuUsage > policy.cpuThreshold) {
    dispatch({
      type: 'redix:performance:low',
      payload: { reason: 'cpu', usage: metrics.cpuUsage },
    });
  }

  // Check battery threshold
  if (metrics?.batteryLevel && metrics.batteryLevel < policy.batteryThreshold) {
    dispatch({
      type: 'redix:performance:low',
      payload: { reason: 'battery', level: metrics.batteryLevel },
    });

    // Disable prefetch on low battery
    if (policy.prefetchEnabled) {
      savePolicy({ prefetchEnabled: false });
    }
  }
}

/**
 * Initialize optimizer (load policy, set up listeners)
 */
export async function initializeOptimizer(): Promise<void> {
  await loadPolicy();
  initializeMemoryPool();

  // Watch for performance events
  Redix.watch(event => {
    if (event.type === 'redix:performance:low') {
      optimizePerformance();
    }
  });

  // Periodic optimization check
  setInterval(() => {
    optimizePerformance();
  }, 30000); // Every 30 seconds
}
