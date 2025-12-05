/**
 * Session Snapshot System - Tier 2
 * Periodic snapshots for crash recovery
 */
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { useAgentStreamStore } from '../../state/agentStreamStore';
import { log } from '../../utils/logger';
const SNAPSHOT_KEY = 'regen_snapshot';
const SNAPSHOT_VERSION = 2; // Bumped to 2 for agent state support
const SNAPSHOT_INTERVAL = 30000; // 30 seconds
let snapshotInterval = null;
/**
 * Create a snapshot of current session state
 */
export function createSnapshot() {
    const tabsStore = useTabsStore.getState();
    const appStore = useAppStore.getState();
    const agentStore = useAgentStreamStore.getState();
    return {
        tabs: tabsStore.tabs,
        activeTabId: tabsStore.activeId,
        mode: appStore.mode,
        agentState: {
            runId: agentStore.runId,
            status: agentStore.status,
            transcript: agentStore.transcript,
            events: agentStore.events.slice(-100), // Keep last 100 events for recovery
            lastGoal: agentStore.lastGoal,
        },
        timestamp: Date.now(),
        version: SNAPSHOT_VERSION,
    };
}
/**
 * Save snapshot to localStorage
 */
export function saveSnapshot(snapshot) {
    try {
        const snap = snapshot || createSnapshot();
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
        log.debug('Session snapshot saved', { tabCount: snap.tabs.length, timestamp: snap.timestamp });
    }
    catch (error) {
        log.error('Failed to save snapshot', error);
    }
}
/**
 * Load snapshot from localStorage
 */
export function loadSnapshot() {
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        if (!raw)
            return null;
        const snapshot = JSON.parse(raw);
        // Validate version - allow version 1 for backward compatibility
        if (snapshot.version && snapshot.version > SNAPSHOT_VERSION) {
            log.warn('Snapshot version too new, ignoring');
            return null;
        }
        // Migrate version 1 to version 2
        if (snapshot.version === 1) {
            snapshot.agentState = undefined; // Will be populated from persisted store
        }
        return snapshot;
    }
    catch (error) {
        log.error('Failed to load snapshot', error);
        return null;
    }
}
/**
 * Start periodic snapshotting
 */
export function startSnapshotting() {
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
export function stopSnapshotting() {
    if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
        log.info('Session snapshotting stopped');
    }
}
/**
 * Clear snapshot
 */
export function clearSnapshot() {
    localStorage.removeItem(SNAPSHOT_KEY);
    log.info('Session snapshot cleared');
}
