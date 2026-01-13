/**
 * Real-Time Event Bus - Regen-v1 Core Nervous System
 * 
 * Event-driven architecture for real-time browser intelligence.
 * 90% UI reaction, 10% AI thinking.
 * 
 * Automatically queues events when offline and replays them when connection is restored.
 */

export type RegenEvent =
  | { type: "TAB_OPEN"; payload?: any }
  | { type: "TAB_CLOSE"; payload?: any }
  | { type: "TAB_SWITCH"; payload?: any }
  | { type: "URL_CHANGE"; payload?: string }
  | { type: "SCROLL_END"; payload?: any }
  | { type: "IDLE"; payload?: number }
  | { type: "AVATAR_INVOKE" }
  | { type: "COMMAND"; payload: string }
  | { type: "AUTOMATION_STARTED"; payload?: any }
  | { type: "AUTOMATION_COMPLETED"; payload?: any }
  | { type: "AUTOMATION_CANCELLED"; payload?: any }
  | { type: "AUTOMATION_TIMEOUT"; payload?: any }
  | { type: "AUTOMATION_FAILED"; payload?: any };

type Listener = (event: RegenEvent) => void;

class EventBus {
  private listeners: Listener[] = [];
  private queue: any = null; // Lazy load event queue to avoid circular dependencies
  
  /**
   * Get event queue (lazy loaded)
   */
  private getEventQueue() {
    if (!this.queue) {
      // Dynamic import to avoid circular dependency
      const { eventQueue } = require('./eventQueue');
      this.queue = eventQueue;
    }
    return this.queue;
  }
  
  emit(e: RegenEvent): void {
    const isOnline = navigator.onLine;
    
    // Critical events that should always be queued
    const criticalEvents: RegenEvent['type'][] = [
      'AUTOMATION_STARTED',
      'AUTOMATION_COMPLETED',
      'AUTOMATION_FAILED',
      'COMMAND',
    ];
    
    const shouldQueue = !isOnline || criticalEvents.includes(e.type);
    
    // Queue event if needed
    if (shouldQueue) {
      try {
        this.getEventQueue().enqueue(e);
      } catch (error) {
        console.warn('[EventBus] Failed to queue event:', error);
      }
    }
    
    // Emit immediately if online (for real-time feedback)
    if (isOnline) {
      // Process all listeners synchronously for real-time reactivity
      for (let i = 0; i < this.listeners.length; i++) {
        try {
          this.listeners[i](e);
        } catch (error) {
          console.error(`[EventBus] Handler error:`, error);
        }
      }
    }
  }
  
  subscribe(l: Listener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter(x => x !== l);
    };
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats() {
    try {
      return this.getEventQueue().getStats();
    } catch {
      return { queued: 0, processed: 0, failed: 0, oldestEventAge: 0 };
    }
  }
  
  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  /**
   * Manually process queue
   */
  async processQueue(): Promise<void> {
    try {
      return this.getEventQueue().processQueue();
    } catch (error) {
      console.error('[EventBus] Failed to process queue:', error);
    }
  }
  
  /**
   * Clear queue
   */
  clearQueue(): void {
    try {
      this.getEventQueue().clear();
    } catch (error) {
      console.error('[EventBus] Failed to clear queue:', error);
    }
  }
}

export const regenEventBus = new EventBus();

// Initialize event queue on module load
if (typeof window !== 'undefined') {
  // Lazy load and initialize queue
  import('./eventQueue').then(({ eventQueue }) => {
    // Queue will auto-process on connection restore
    console.log('[EventBus] Event queue system initialized');
  }).catch((error) => {
    console.warn('[EventBus] Failed to initialize event queue:', error);
  });
}