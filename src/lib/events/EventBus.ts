/**
 * Event Bus - Real-Time Event Streaming System
 * 
 * Central event bus for streaming UI actions to intelligence components.
 * Enables real-time context awareness without manual triggers.
 */

export type RegenEventType =
  | 'NAVIGATE'
  | 'TAB_OPEN'
  | 'TAB_CLOSE'
  | 'TAB_SWITCH'
  | 'TAB_UPDATE'
  | 'SCROLL'
  | 'SEARCH_SUBMIT'
  | 'TEXT_SELECT'
  | 'IDLE_TIMEOUT'
  | 'FOCUS_LOSS'
  | 'PAGE_LOAD'
  | 'PAGE_ERROR'
  | 'CLICK'
  | 'KEYPRESS';

export interface RegenEvent {
  type: RegenEventType;
  timestamp: number;
  data: Record<string, any>;
  source?: string;
}

type EventHandler = (event: RegenEvent) => void;

class EventBus {
  private handlers: Map<RegenEventType, Set<EventHandler>> = new Map();
  private eventHistory: RegenEvent[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Subscribe to event type
   */
  on(eventType: RegenEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to multiple event types
   */
  onMany(eventTypes: RegenEventType[], handler: EventHandler): () => void {
    const unsubscribers = eventTypes.map((type) => this.on(type, handler));
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    return this.onMany(
      ['NAVIGATE', 'TAB_OPEN', 'TAB_CLOSE', 'TAB_SWITCH', 'SCROLL', 'SEARCH_SUBMIT', 'TEXT_SELECT', 'IDLE_TIMEOUT', 'FOCUS_LOSS', 'PAGE_LOAD', 'PAGE_ERROR', 'CLICK', 'KEYPRESS', 'TAB_UPDATE'],
      handler
    );
  }

  /**
   * Emit event
   */
  emit(eventType: RegenEventType, data: Record<string, any> = {}, source?: string): void {
    const event: RegenEvent = {
      type: eventType,
      timestamp: Date.now(),
      data,
      source,
    };

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    // Notify handlers
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Handler error for ${eventType}:`, error);
        }
      });
    }

    // Also notify "all" handlers if we had a separate mechanism
    // For now, we use the onAll which subscribes to all types
  }

  /**
   * Get recent events
   */
  getHistory(eventType?: RegenEventType, limit: number = 50): RegenEvent[] {
    let events = this.eventHistory;
    if (eventType) {
      events = events.filter((e) => e.type === eventType);
    }
    return events.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    byType: Record<RegenEventType, number>;
    recentRate: number; // Events per minute
  } {
    const byType: Record<string, number> = {};
    const oneMinuteAgo = Date.now() - 60000;
    let recentCount = 0;

    for (const event of this.eventHistory) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      if (event.timestamp > oneMinuteAgo) {
        recentCount++;
      }
    }

    return {
      totalEvents: this.eventHistory.length,
      byType: byType as Record<RegenEventType, number>,
      recentRate: recentCount,
    };
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Convenience functions for common events
export const emitNavigate = (url: string, tabId?: string) => {
  eventBus.emit('NAVIGATE', { url, tabId }, 'navigation');
};

export const emitTabOpen = (tabId: string, url: string) => {
  eventBus.emit('TAB_OPEN', { tabId, url }, 'tab-manager');
};

export const emitTabClose = (tabId: string) => {
  eventBus.emit('TAB_CLOSE', { tabId }, 'tab-manager');
};

export const emitTabSwitch = (tabId: string) => {
  eventBus.emit('TAB_SWITCH', { tabId }, 'tab-manager');
};

export const emitScroll = (depth: number, url: string) => {
  eventBus.emit('SCROLL', { depth, url }, 'scrolling');
};

export const emitSearch = (query: string, results?: number) => {
  eventBus.emit('SEARCH_SUBMIT', { query, results }, 'search');
  // Also emit the legacy event for backwards compatibility
  window.dispatchEvent(new CustomEvent('regen:search'));
};

export const emitTextSelect = (text: string, url: string) => {
  eventBus.emit('TEXT_SELECT', { text, url }, 'selection');
};

export const emitIdleTimeout = (duration: number, url: string) => {
  eventBus.emit('IDLE_TIMEOUT', { duration, url }, 'idle-detector');
};

export const emitPageLoad = (url: string, title?: string) => {
  eventBus.emit('PAGE_LOAD', { url, title }, 'page-loader');
};

export const emitPageError = (url: string, error: string) => {
  eventBus.emit('PAGE_ERROR', { url, error }, 'error-handler');
};
