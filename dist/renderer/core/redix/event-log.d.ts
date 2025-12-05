/**
 * Redix Event Log System
 * Append-only log with deterministic reducers and time-travel debugging
 */
export interface RedixEvent {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    reducer?: string;
    metadata?: Record<string, any>;
}
export interface RedixState {
    [key: string]: any;
}
export type Reducer = (state: RedixState, event: RedixEvent) => RedixState;
/**
 * Initialize persistence (load from storage)
 */
export declare function initPersistence(): Promise<void>;
/**
 * Register a reducer
 */
export declare function registerReducer(name: string, reducer: Reducer): void;
/**
 * Get registered reducer names
 */
export declare function getRegisteredReducers(): string[];
/**
 * Dispatch an event (append to log and apply reducer)
 */
export declare function dispatchEvent(event: Omit<RedixEvent, 'id' | 'timestamp'>): RedixEvent;
/**
 * Get current state
 */
export declare function getCurrentState(): RedixState;
/**
 * Get state at a specific event index (time-travel)
 */
export declare function getStateAtEventIndex(index: number): RedixState;
/**
 * Get state at a specific timestamp
 */
export declare function getStateAtTimestamp(timestamp: number): RedixState;
/**
 * Replay all events from scratch (rebuild state)
 */
export declare function replayEvents(): RedixState;
/**
 * Get event log
 */
export declare function getEventLog(): RedixEvent[];
/**
 * Get events in a time range
 */
export declare function getEventsInRange(startTime: number, endTime: number): RedixEvent[];
/**
 * Get events by type
 */
export declare function getEventsByType(type: string): RedixEvent[];
/**
 * Undo last event (remove from log and replay)
 */
export declare function undo(): RedixState | null;
/**
 * Redo (restore last undone event)
 */
export declare function redo(): RedixState | null;
/**
 * Clear event log
 */
export declare function clearEventLog(): void;
/**
 * Get event by ID
 */
export declare function getEventById(id: string): RedixEvent | undefined;
/**
 * Get event count
 */
export declare function getEventCount(): number;
/**
 * Get snapshot count
 */
export declare function getSnapshotCount(): number;
/**
 * Export event log (for debugging/analysis)
 */
export declare function exportEventLog(): string;
/**
 * Import event log (for debugging/analysis)
 */
export declare function importEventLog(data: string): void;
