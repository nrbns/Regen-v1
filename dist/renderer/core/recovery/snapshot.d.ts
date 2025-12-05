/**
 * Session Snapshot System - Tier 2
 * Periodic snapshots for crash recovery
 */
import type { Tab } from '../../state/tabsStore';
import type { StreamStatus, AgentStreamEvent } from '../../state/agentStreamStore';
export interface SessionSnapshot {
    tabs: Tab[];
    activeTabId: string | null;
    mode: string;
    agentState?: {
        runId: string | null;
        status: StreamStatus;
        transcript: string;
        events: AgentStreamEvent[];
        lastGoal: string | null;
    };
    timestamp: number;
    version: number;
}
/**
 * Create a snapshot of current session state
 */
export declare function createSnapshot(): SessionSnapshot;
/**
 * Save snapshot to localStorage
 */
export declare function saveSnapshot(snapshot?: SessionSnapshot): void;
/**
 * Load snapshot from localStorage
 */
export declare function loadSnapshot(): SessionSnapshot | null;
/**
 * Start periodic snapshotting
 */
export declare function startSnapshotting(): void;
/**
 * Stop periodic snapshotting
 */
export declare function stopSnapshotting(): void;
/**
 * Clear snapshot
 */
export declare function clearSnapshot(): void;
