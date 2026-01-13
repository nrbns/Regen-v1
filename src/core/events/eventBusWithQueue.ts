/**
 * Event Bus with Queue Integration
 * 
 * Wraps the event bus to automatically queue events when offline
 * and replay them when connection is restored.
 */

import { regenEventBus, type RegenEvent } from './eventBus';
import { eventQueue } from './eventQueue';

/**
 * Enhanced event bus that queues events when offline
 */
class EventBusWithQueue {
  /**
   * Emit event (queued if offline)
   */
  emit(event: RegenEvent): void {
    // Always queue critical events
    const criticalEvents: RegenEvent['type'][] = [
      'AUTOMATION_STARTED',
      'AUTOMATION_COMPLETED',
      'AUTOMATION_FAILED',
      'COMMAND',
    ];

    const shouldQueue = !navigator.onLine || criticalEvents.includes(event.type);

    if (shouldQueue) {
      eventQueue.enqueue(event);
    }

    // Also emit immediately if online (for real-time feedback)
    if (navigator.onLine) {
      try {
        regenEventBus.emit(event);
      } catch (error) {
        console.error('[EventBusWithQueue] Failed to emit, queuing instead:', error);
        eventQueue.enqueue(event);
      }
    }
  }

  /**
   * Subscribe to events (passes through to regenEventBus)
   */
  subscribe(listener: (event: RegenEvent) => void): () => void {
    return regenEventBus.subscribe(listener);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return eventQueue.getStats();
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return eventQueue.isConnected();
  }

  /**
   * Manually process queue
   */
  async processQueue(): Promise<void> {
    return eventQueue.processQueue();
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    eventQueue.clear();
  }
}

// Export enhanced event bus
export const regenEventBusWithQueue = new EventBusWithQueue();

// Also export the original for direct access when needed
export { regenEventBus };
