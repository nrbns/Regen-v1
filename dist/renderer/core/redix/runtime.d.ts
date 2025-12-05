/**
 * Redix Runtime - Real-time orchestration & optimization engine
 * Event bus (pub/sub) for browser-wide coordination + state snapshots
 */
import { RedixEvent as RedixLogEvent, RedixState } from './event-log';
export interface RedixStateDiffEntry {
    path: string;
    before: unknown;
    after: unknown;
}
export interface RedixSnapshot {
    id: string;
    eventId: string;
    eventType: string;
    timestamp: number;
    state: RedixState;
    diff: RedixStateDiffEntry[];
}
export interface RedixDispatchEvent {
    type: string;
    payload?: any;
    source?: string;
    reducer?: string;
    metadata?: Record<string, any>;
}
export interface RedixEvent extends RedixLogEvent {
    source?: string;
    ts: number;
    prevState?: RedixState;
    nextState?: RedixState;
    diff?: RedixStateDiffEntry[];
}
type RedixListener = (event: RedixEvent) => void;
declare class RedixRuntime {
    private listeners;
    private globalListeners;
    private eventHistory;
    private snapshots;
    private initialized;
    private initPromise;
    private dispatchCount;
    /**
     * Ensure persistence + reducers are initialized (only once).
     */
    private ensureInitialized;
    /**
     * Watch for specific event types
     */
    watch(eventType: string | RedixListener, handler?: RedixListener): () => void;
    /**
     * Dispatch an event to all listeners and capture state snapshots/diffs
     */
    dispatch(event: RedixDispatchEvent): RedixEvent;
    /**
     * Get recent event history
     */
    getHistory(eventType?: string, limit?: number): RedixEvent[];
    /**
     * Get current Redix state
     */
    getState(): RedixState;
    /**
     * Time-travel to a specific event or timestamp
     */
    timeTravel(options: {
        eventId?: string;
        eventIndex?: number;
        timestamp?: number;
    }): RedixState | null;
    /**
     * Undo last event via event-log
     */
    undo(): RedixState | null;
    /**
     * Redo last undone event via event-log
     */
    redo(): RedixState | null;
    /**
     * Get snapshot history (newest first)
     */
    getSnapshots(limit?: number): RedixSnapshot[];
    /**
     * Clear all listeners and in-memory history (does not clear event-log).
     */
    clear(): void;
    private recordEvent;
    private maybeCaptureSnapshot;
    private notifyListeners;
    /**
     * Sync in-memory history with event-log (used after undo/redo)
     */
    private syncHistoryFromLog;
}
export declare const Redix: RedixRuntime;
export declare const watch: (eventType: string | RedixListener, handler?: RedixListener) => () => void;
export declare const dispatch: (event: RedixDispatchEvent) => RedixEvent;
export declare const getRedixState: () => RedixState;
export declare const getRedixHistory: (eventType?: string, limit?: number) => RedixEvent[];
export declare const getRedixSnapshots: (limit?: number) => RedixSnapshot[];
export declare const timeTravelRedix: (options: {
    eventId?: string;
    eventIndex?: number;
    timestamp?: number;
}) => RedixState | null;
export declare const undoRedix: () => RedixState | null;
export declare const redoRedix: () => RedixState | null;
export {};
