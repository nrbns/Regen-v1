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

// Undo/Redo stack
const undoStack: RedixEvent[] = [];
const MAX_UNDO_STACK = 100;

// Persistence
const STORAGE_KEY = 'redix:event-log';
const MAX_PERSISTED_EVENTS = 1000; // Keep last 1000 events in storage
let persistenceEnabled = false;
let persistenceInitialized = false;

/**
 * Initialize persistence (load from storage)
 */
export async function initPersistence(): Promise<void> {
  if (persistenceInitialized) return;
  persistenceInitialized = true;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.events)) {
          // Load last N events (to avoid memory issues)
          const eventsToLoad = parsed.events.slice(-MAX_PERSISTED_EVENTS);
          eventLog.length = 0;
          eventLog.push(...eventsToLoad);
          
          // Restore state snapshots if available
          if (parsed.snapshots) {
            stateSnapshots.clear();
            for (const [index, state] of Object.entries(parsed.snapshots)) {
              stateSnapshots.set(Number(index), state as RedixState);
            }
          }
          
          // Replay events to rebuild current state
          replayEvents();
          
          console.log(`[Redix] Loaded ${eventLog.length} events from storage`);
        }
      }
      persistenceEnabled = true;
    }
  } catch (error) {
    console.warn('[Redix] Failed to initialize persistence:', error);
  }
}

/**
 * Persist event log to storage
 */
function persistEventLog(): void {
  if (!persistenceEnabled) return;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Only persist last N events
      const eventsToPersist = eventLog.slice(-MAX_PERSISTED_EVENTS);
      
      // Convert snapshots to plain object
      const snapshotsObj: Record<string, RedixState> = {};
      for (const [index, state] of stateSnapshots.entries()) {
        snapshotsObj[index] = state;
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        events: eventsToPersist,
        snapshots: snapshotsObj,
        lastUpdated: Date.now(),
      }));
    }
  } catch (error) {
    console.warn('[Redix] Failed to persist event log:', error);
  }
}

/**
 * Register a reducer
 */
export function registerReducer(name: string, reducer: Reducer): void {
  if (typeof reducer !== 'function') {
    throw new Error(`Reducer must be a function, got ${typeof reducer}`);
  }
  reducers.set(name, reducer);
}

/**
 * Get registered reducer names
 */
export function getRegisteredReducers(): string[] {
  return Array.from(reducers.keys());
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

  // Persist to storage (debounced)
  if (eventLog.length % 10 === 0) {
    persistEventLog();
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

  // Pop from event log and add to undo stack
  const event = eventLog.pop()!;
  undoStack.push(event);
  
  // Limit undo stack size
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }

  // Replay to rebuild state
  return replayEvents();
}

/**
 * Redo (restore last undone event)
 */
export function redo(): RedixState | null {
  if (undoStack.length === 0) {
    return null;
  }

  // Pop from undo stack and add back to event log
  const event = undoStack.pop()!;
  eventLog.push(event);

  // Apply reducer if specified
  if (event.reducer) {
    const reducer = reducers.get(event.reducer);
    if (reducer) {
      currentState = reducer(currentState, event);
    }
  }

  // Replay to rebuild state
  return replayEvents();
}

/**
 * Clear event log
 */
export function clearEventLog(): void {
  eventLog.length = 0;
  stateSnapshots.clear();
  undoStack.length = 0;
  currentState = {};
  persistEventLog();
}

/**
 * Get event by ID
 */
export function getEventById(id: string): RedixEvent | undefined {
  return eventLog.find(e => e.id === id);
}

/**
 * Get event count
 */
export function getEventCount(): number {
  return eventLog.length;
}

/**
 * Get snapshot count
 */
export function getSnapshotCount(): number {
  return stateSnapshots.size;
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
    // Note: Snapshot restoration would require storing full snapshot data in export
    // For now, snapshots are rebuilt during replay
    replayEvents();
  } catch (error) {
    throw new Error(`Failed to import event log: ${error}`);
  }
}

