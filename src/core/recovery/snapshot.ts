/**
 * Session Snapshot System - Tier 2
 * Periodic snapshots for crash recovery
 */

import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { log } from '../../utils/logger';
import type { Tab } from '../../state/tabsStore';

export interface SessionSnapshot {
  tabs: Tab[];
  activeTabId: string | null;
  mode: string;
  timestamp: number;
  version: number;
}

const SNAPSHOT_KEY = 'omnibrowser_snapshot';
const SNAPSHOT_VERSION = 1;
const SNAPSHOT_INTERVAL = 30000; // 30 seconds

let snapshotInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Create a snapshot of current session state
 */
export function createSnapshot(): SessionSnapshot {
  const tabsStore = useTabsStore.getState();
  const appStore = useAppStore.getState();

  return {
    tabs: tabsStore.tabs,
    activeTabId: tabsStore.activeId,
    mode: appStore.mode,
    timestamp: Date.now(),
    version: SNAPSHOT_VERSION,
  };
}

/**
 * Save snapshot to localStorage
 */
export function saveSnapshot(snapshot?: SessionSnapshot): void {
  try {
    const snap = snapshot || createSnapshot();
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    log.debug('Session snapshot saved', { tabCount: snap.tabs.length, timestamp: snap.timestamp });
  } catch (error) {
    log.error('Failed to save snapshot', error);
  }
}

/**
 * Load snapshot from localStorage
 */
export function loadSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as SessionSnapshot;

    // Validate version
    if (snapshot.version !== SNAPSHOT_VERSION) {
      log.warn('Snapshot version mismatch, ignoring');
      return null;
    }

    return snapshot;
  } catch (error) {
    log.error('Failed to load snapshot', error);
    return null;
  }
}

/**
 * Start periodic snapshotting
 */
export function startSnapshotting(): void {
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
  }

  // Initial snapshot
  saveSnapshot();

  // Periodic snapshots
  snapshotInterval = setInterval(() => {
    saveSnapshot();
  }, SNAPSHOT_INTERVAL);

  log.info('Session snapshotting started', { interval: SNAPSHOT_INTERVAL });
}

/**
 * Stop periodic snapshotting
 */
export function stopSnapshotting(): void {
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
    log.info('Session snapshotting stopped');
  }
}

/**
 * Clear snapshot
 */
export function clearSnapshot(): void {
  localStorage.removeItem(SNAPSHOT_KEY);
  log.info('Session snapshot cleared');
}
