/**
 * Global Event Bus - Tier 2
 * Centralized event system for mode-shifts and state changes
 */

type EventCallback = (...args: unknown[]) => void;
type EventMap = Record<string, EventCallback[]>;

class EventBus {
  private events: EventMap = {};

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: unknown[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[EventBus] Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Subscribe to an event once
   */
  once(event: string, callback: EventCallback): void {
    const wrappedCallback = (...args: unknown[]) => {
      callback(...args);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * Clear all listeners for an event
   */
  clear(event: string): void {
    delete this.events[event];
  }

  /**
   * Clear all events
   */
  clearAll(): void {
    this.events = {};
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.events[event]?.length ?? 0;
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Common event types
export const EVENTS = {
  MODE_CHANGED: 'mode:changed',
  TAB_OPENED: 'tab:opened',
  TAB_CLOSED: 'tab:closed',
  TAB_ACTIVATED: 'tab:activated',
  SESSION_SAVED: 'session:saved',
  SESSION_RESTORED: 'session:restored',
  CACHE_CLEARED: 'cache:cleared',
  ERROR_OCCURRED: 'error:occurred',
} as const;
