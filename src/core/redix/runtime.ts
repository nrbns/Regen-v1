/**
 * Redix Runtime - Real-time orchestration & optimization engine
 * Event bus (pub/sub) for browser-wide coordination
 */

export interface RedixEvent {
  type: string;
  payload: any;
  ts: number;
  source?: string;
}

type RedixListener = (event: RedixEvent) => void;

class RedixRuntime {
  private listeners: Map<string, Set<RedixListener>> = new Map();
  private globalListeners: Set<RedixListener> = new Set();
  private eventHistory: RedixEvent[] = [];
  private maxHistorySize = 100;

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
   * Dispatch an event to all listeners
   */
  dispatch(event: Omit<RedixEvent, 'ts'>): void {
    const fullEvent: RedixEvent = {
      ...event,
      ts: Date.now(),
    };

    // Initialize persistence on first dispatch
    try {
      const { initPersistence } = require('./event-log');
      if (!(globalThis as any).__redixPersistenceInitialized) {
        initPersistence().catch(console.warn);
        (globalThis as any).__redixPersistenceInitialized = true;
      }
    } catch {
      // Event log not available, continue without it
    }

    // Add to event log (if available)
    try {
      const { dispatchEvent } = require('./event-log');
      dispatchEvent({
        type: fullEvent.type,
        payload: fullEvent.payload,
        reducer: (event as any).reducer,
        metadata: { source: fullEvent.source },
      });
    } catch {
      // Event log not available, continue without it
    }

    // Register default reducers on first dispatch
    try {
      const { registerDefaultReducers } = require('./reducers');
      if (!(globalThis as any).__redixReducersRegistered) {
        registerDefaultReducers();
        (globalThis as any).__redixReducersRegistered = true;
      }
    } catch {
      // Reducers not available, continue without them
    }

    // Add to history
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(fullEvent);
        } catch (error) {
          console.error('[Redix] Listener error:', error);
        }
      });
    }

    // Notify global listeners
    this.globalListeners.forEach(listener => {
      try {
        listener(fullEvent);
      } catch (error) {
        console.error('[Redix] Global listener error:', error);
      }
    });
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
   * Clear all listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
    this.eventHistory = [];
  }
}

// Singleton instance
export const Redix = new RedixRuntime();

// Export convenience methods
export const watch = (eventType: string | RedixListener, handler?: RedixListener) => Redix.watch(eventType, handler);
export const dispatch = (event: Omit<RedixEvent, 'ts'>) => Redix.dispatch(event);

