/**
 * Redix Runtime - Real-time orchestration & optimization engine
 * Event bus (pub/sub) for browser-wide coordination + state snapshots
 */

import {
  RedixEvent as RedixLogEvent,
  RedixState,
  dispatchEvent as logEvent,
  getCurrentState,
  // getEventById, // Unused for now
  // getEventCount, // Unused for now
  getEventLog,
  getStateAtEventIndex,
  getStateAtTimestamp,
  initPersistence,
  redo as redoEventLog,
  undo as undoEventLog,
} from './event-log';

import { registerDefaultReducers } from './reducers';

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

const MAX_HISTORY_SIZE = 200;
const MAX_SNAPSHOTS = 100;
const SNAPSHOT_EVERY = 5;
const MAX_DIFF_ENTRIES = 50;
const MAX_DIFF_DEPTH = 2;

class RedixRuntime {
  private listeners: Map<string, Set<RedixListener>> = new Map();
  private globalListeners: Set<RedixListener> = new Set();
  private eventHistory: RedixEvent[] = [];
  private snapshots: RedixSnapshot[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private dispatchCount = 0;

  /**
   * Ensure persistence + reducers are initialized (only once).
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = initPersistence()
        .catch((error) => {
          console.warn('[Redix] Persistence init failed:', error);
        })
        .finally(() => {
          try {
            registerDefaultReducers();
          } catch (error) {
            console.warn('[Redix] Default reducers failed to register:', error);
          }
          this.initialized = true;
          this.initPromise = null;
        });
    }
  }

  /**
   * Watch for specific event types
   */
  watch(eventType: string | RedixListener, handler?: RedixListener): () => void {
    if (typeof eventType === 'function') {
      // Global listener
      this.globalListeners.add(eventType);
      return () => this.globalListeners.delete(eventType);
    }

    if (!handler) {
      throw new Error('Handler required when watching specific event type');
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(handler);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Dispatch an event to all listeners and capture state snapshots/diffs
   */
  dispatch(event: RedixDispatchEvent): RedixEvent {
    this.ensureInitialized();

    const prevState = getCurrentState();

    const loggedEvent = logEvent({
      type: event.type,
      payload: event.payload,
      reducer: event.reducer,
      metadata: {
        ...(event.metadata || {}),
        source: event.source || event.metadata?.source,
      },
    });

    const nextState = getCurrentState();
    const diff = computeStateDiff(prevState, nextState);

    const runtimeEvent: RedixEvent = {
      ...loggedEvent,
      source: event.source,
      ts: loggedEvent.timestamp,
      prevState,
      nextState,
      diff,
    };

    this.recordEvent(runtimeEvent);
    this.maybeCaptureSnapshot(runtimeEvent);
    this.notifyListeners(runtimeEvent);

    return runtimeEvent;
  }

  /**
   * Get recent event history
   */
  getHistory(eventType?: string, limit = 10): RedixEvent[] {
    let events = this.eventHistory;
    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }
    return events.slice(-limit).reverse();
  }

  /**
   * Get current Redix state
   */
  getState(): RedixState {
    return getCurrentState();
  }

  /**
   * Time-travel to a specific event or timestamp
   */
  timeTravel(options: { eventId?: string; eventIndex?: number; timestamp?: number }): RedixState | null {
    try {
      if (options.eventId) {
        const index = getEventLog().findIndex(e => e.id === options.eventId);
        if (index >= 0) {
          return getStateAtEventIndex(index);
        }
        return null;
      }

      if (typeof options.eventIndex === 'number') {
        return getStateAtEventIndex(options.eventIndex);
      }

      if (typeof options.timestamp === 'number') {
        return getStateAtTimestamp(options.timestamp);
      }

      return null;
    } catch (error) {
      console.error('[Redix] timeTravel failed:', error);
      return null;
    }
  }

  /**
   * Undo last event via event-log
   */
  undo(): RedixState | null {
    const state = undoEventLog();
    if (state) {
      this.syncHistoryFromLog();
    }
    return state;
  }

  /**
   * Redo last undone event via event-log
   */
  redo(): RedixState | null {
    const state = redoEventLog();
    if (state) {
      this.syncHistoryFromLog();
    }
    return state;
  }

  /**
   * Get snapshot history (newest first)
   */
  getSnapshots(limit = 10): RedixSnapshot[] {
    return this.snapshots.slice(-limit).reverse();
  }

  /**
   * Clear all listeners and in-memory history (does not clear event-log).
   */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
    this.eventHistory = [];
    this.snapshots = [];
  }

  private recordEvent(event: RedixEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > MAX_HISTORY_SIZE) {
      this.eventHistory.shift();
    }
  }

  private maybeCaptureSnapshot(event: RedixEvent): void {
    this.dispatchCount += 1;
    if (this.dispatchCount % SNAPSHOT_EVERY !== 0) {
      return;
    }

    const snapshot: RedixSnapshot = {
      id: `snapshot_${event.id}`,
      eventId: event.id,
      eventType: event.type,
      timestamp: event.timestamp,
      state: event.nextState ? { ...event.nextState } : getCurrentState(),
      diff: event.diff || [],
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }

  private notifyListeners(event: RedixEvent): void {
    // Notify specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[Redix] Listener error:', error);
        }
      });
    }

    // Notify global listeners
    this.globalListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[Redix] Global listener error:', error);
      }
    });
  }

  /**
   * Sync in-memory history with event-log (used after undo/redo)
   */
  private syncHistoryFromLog(): void {
    const log = getEventLog();
    this.eventHistory = log.slice(-MAX_HISTORY_SIZE).map((event) => ({
      ...event,
      ts: event.timestamp,
    }));
  }
}

function computeStateDiff(prev: RedixState, next: RedixState): RedixStateDiffEntry[] {
  if (!prev && !next) return [];
  const diffs: RedixStateDiffEntry[] = [];
  walkDiff(prev || {}, next || {}, '', 0, diffs);
  return diffs.slice(0, MAX_DIFF_ENTRIES);
}

function walkDiff(
  prev: Record<string, any>,
  next: Record<string, any>,
  path: string,
  depth: number,
  diffs: RedixStateDiffEntry[]
): void {
  if (depth > MAX_DIFF_DEPTH || diffs.length >= MAX_DIFF_ENTRIES) {
    return;
  }

  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  keys.forEach((key) => {
    if (diffs.length >= MAX_DIFF_ENTRIES) return;
    const currentPath = path ? `${path}.${key}` : key;
    const prevValue = prev?.[key];
    const nextValue = next?.[key];

    if (!Object.prototype.hasOwnProperty.call(next || {}, key)) {
      diffs.push({ path: currentPath, before: prevValue, after: undefined });
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(prev || {}, key)) {
      diffs.push({ path: currentPath, before: undefined, after: nextValue });
      return;
    }

    if (isPlainObject(prevValue) && isPlainObject(nextValue)) {
      const prevString = JSON.stringify(prevValue);
      const nextString = JSON.stringify(nextValue);
      if (prevString !== nextString) {
        walkDiff(prevValue, nextValue, currentPath, depth + 1, diffs);
      }
      return;
    }

    if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
      const prevString = JSON.stringify(prevValue);
      const nextString = JSON.stringify(nextValue);
      if (prevString !== nextString) {
        diffs.push({ path: currentPath, before: prevValue, after: nextValue });
      }
      return;
    }

    if (prevValue !== nextValue) {
      diffs.push({ path: currentPath, before: prevValue, after: nextValue });
    }
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

// Singleton instance
export const Redix = new RedixRuntime();

// Export convenience methods
export const watch = (eventType: string | RedixListener, handler?: RedixListener) => Redix.watch(eventType, handler);
export const dispatch = (event: RedixDispatchEvent) => Redix.dispatch(event);
export const getRedixState = () => Redix.getState();
export const getRedixHistory = (eventType?: string, limit?: number) => Redix.getHistory(eventType, limit);
export const getRedixSnapshots = (limit?: number) => Redix.getSnapshots(limit);
export const timeTravelRedix = (options: { eventId?: string; eventIndex?: number; timestamp?: number }) =>
  Redix.timeTravel(options);
export const undoRedix = () => Redix.undo();
export const redoRedix = () => Redix.redo();


