/**
 * Container Management
 * Per-tab ephemeral containers and "Burn Tab" functionality
 */

import { session, BrowserView } from 'electron';
import { randomUUID } from 'node:crypto';

interface TabContainer {
  tabId: string;
  partition: string;
  ephemeral: boolean;
  createdAt: number;
}

const tabContainers = new Map<string, TabContainer>();

/**
 * Create an ephemeral container for a tab
 */
export function createEphemeralContainer(tabId: string): string {
  const partition = `ephemeral:${randomUUID()}`;
  
  tabContainers.set(tabId, {
    tabId,
    partition,
    ephemeral: true,
    createdAt: Date.now(),
  });

  return partition;
}

/**
 * Get container for a tab
 */
export function getTabContainer(tabId: string): TabContainer | undefined {
  return tabContainers.get(tabId);
}

/**
 * Burn a tab (clear storage, cache, history)
 */
export async function burnTab(tabId: string, view: BrowserView): Promise<void> {
  const container = tabContainers.get(tabId);
  if (!container) return;

  const sess = session.fromPartition(container.partition);

  // Clear all storage
  await sess.clearStorageData({
    storages: [
      'cookies',
      'filesystem',
      'indexdb',
      'localstorage',
      'shadercache',
      'websql',
      'serviceworkers',
      'cachestorage',
    ],
  });

  // Clear cache
  await sess.clearCache();

  // Clear cookies
  await sess.cookies.flushStore();

  // Remove from container registry
  tabContainers.delete(tabId);

  console.log(`[Containers] Burned tab ${tabId}`);
}

/**
 * Check if tab is ephemeral
 */
export function isEphemeralTab(tabId: string): boolean {
  const container = tabContainers.get(tabId);
  return container?.ephemeral || false;
}

