/**
 * Redix Event Log System
 * Append-only log with deterministic reducers and time-travel debugging
 */

export interface RedixEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  reducer?: string; // Optional reducer name for this event
  metadata?: Record<string, any>;
}

export interface RedixState {
  [key: string]: any;
}

export type Reducer = (state: RedixState, event: RedixEvent) => RedixState;

// Event log (append-only)
const eventLog: RedixEvent[] = [];

// Reducers registry
const reducers = new Map<string, Reducer>();

// Current state (computed from log)
let currentState: RedixState = {};

// State snapshots for time-travel (every N events)
const stateSnapshots = new Map<number, RedixState>(); // eventIndex -> state
const SNAPSHOT_INTERVAL = 50; // Create snapshot every 50 events

/**
 * Register a reducer
 */
export function registerReducer(name: string, reducer: Reducer): void {
  reducers.set(name, reducer);
}

/**
 * Dispatch an event (append to log and apply reducer)
 */
export function dispatchEvent(event: Omit<RedixEvent, 'id' | 'timestamp'>): RedixEvent {
  const fullEvent: RedixEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    ...event,
  };

  // Append to log
  eventLog.push(fullEvent);

  // Apply reducer if specified
  if (fullEvent.reducer) {
    const reducer = reducers.get(fullEvent.reducer);
    if (reducer) {
      currentState = reducer(currentState, fullEvent);
    }
  }

  // Create snapshot periodically
  if (eventLog.length % SNAPSHOT_INTERVAL === 0) {
    stateSnapshots.set(eventLog.length - 1, { ...currentState });
  }

  return fullEvent;
}

/**
 * Get current state
 */
export function getCurrentState(): RedixState {
  return { ...currentState };
}

/**
 * Get state at a specific event index (time-travel)
 */
export function getStateAtEventIndex(index: number): RedixState {
  if (index < 0 || index >= eventLog.length) {
    throw new Error(`Invalid event index: ${index}`);
  }

  // Find nearest snapshot
  let snapshotIndex = -1;
  let snapshotState: RedixState = {};

  for (const [snapIndex, snapState] of stateSnapshots.entries()) {
    if (snapIndex <= index && snapIndex > snapshotIndex) {
      snapshotIndex = snapIndex;
      snapshotState = { ...snapState };
    }
  }

  // Replay events from snapshot to target index
  for (let i = snapshotIndex + 1; i <= index; i++) {
    const event = eventLog[i];
    if (event.reducer) {
      const reducer = reducers.get(event.reducer);
      if (reducer) {
        snapshotState = reducer(snapshotState, event);
      }
    }
  }

  return snapshotState;
}

/**
 * Get state at a specific timestamp
 */
export function getStateAtTimestamp(timestamp: number): RedixState {
  const index = eventLog.findIndex(e => e.timestamp > timestamp);
  if (index === -1) {
    return getCurrentState(); // All events are before timestamp
  }
  if (index === 0) {
    return {}; // All events are after timestamp
  }
  return getStateAtEventIndex(index - 1);
}

/**
 * Replay all events from scratch (rebuild state)
 */
export function replayEvents(): RedixState {
  currentState = {};
  stateSnapshots.clear();

  for (let i = 0; i < eventLog.length; i++) {
    const event = eventLog[i];
    if (event.reducer) {
      const reducer = reducers.get(event.reducer);
      if (reducer) {
        currentState = reducer(currentState, event);
      }
    }

    // Create snapshot periodically
    if ((i + 1) % SNAPSHOT_INTERVAL === 0) {
      stateSnapshots.set(i, { ...currentState });
    }
  }

  return currentState;
}

/**
 * Get event log
 */
export function getEventLog(): RedixEvent[] {
  return [...eventLog];
}

/**
 * Get events in a time range
 */
export function getEventsInRange(startTime: number, endTime: number): RedixEvent[] {
  return eventLog.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
}

/**
 * Get events by type
 */
export function getEventsByType(type: string): RedixEvent[] {
  return eventLog.filter(e => e.type === type);
}

/**
 * Undo last event (remove from log and replay)
 */
export function undo(): RedixState | null {
  if (eventLog.length === 0) {
    return null;
  }

  eventLog.pop();
  return replayEvents();
}

/**
 * Redo (if we had undo history, but for now we don't support redo)
 * In a full implementation, you'd maintain an undo stack
 */
export function redo(): RedixState | null {
  // Redo not supported in current implementation
  // Would require maintaining an undo stack
  return null;
}

/**
 * Clear event log
 */
export function clearEventLog(): void {
  eventLog.length = 0;
  stateSnapshots.clear();
  currentState = {};
}

/**
 * Export event log (for debugging/analysis)
 */
export function exportEventLog(): string {
  return JSON.stringify({
    events: eventLog,
    state: currentState,
    snapshotIndices: Array.from(stateSnapshots.keys()),
  }, null, 2);
}

/**
 * Import event log (for debugging/analysis)
 */
export function importEventLog(data: string): void {
  try {
    const parsed = JSON.parse(data);
    eventLog.length = 0;
    eventLog.push(...parsed.events);
    stateSnapshots.clear();
    for (const [index, state] of Object.entries(parsed.snapshotIndices || [])) {
      // Would need to restore snapshots from exported data
    }
    replayEvents();
  } catch (error) {
    throw new Error(`Failed to import event log: ${error}`);
  }
}

