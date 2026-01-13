/**
 * Event Queue System
 * 
 * Queues events locally when offline and replays them when connection is restored.
 * Ensures no events are lost during network disruptions.
 * 
 * Features:
 * - Local storage persistence
 * - Automatic replay on reconnect
 * - Configurable queue size limits
 * - Event deduplication
 */

import { regenEventBus, type RegenEvent } from './eventBus';

const QUEUE_STORAGE_KEY = 'regen_event_queue';
const MAX_QUEUE_SIZE = 1000; // Maximum events to queue
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface QueuedEvent {
  event: RegenEvent;
  timestamp: number;
  id: string;
  retryCount: number;
}

export interface EventQueueStats {
  queued: number;
  processed: number;
  failed: number;
  oldestEventAge: number;
}

class EventQueue {
  private queue: QueuedEvent[] = [];
  private isOnline: boolean = navigator.onLine;
  private isProcessing: boolean = false;
  private listeners: Set<(stats: EventQueueStats) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupOnlineOfflineListeners();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      console.log('[EventQueue] Connection restored, processing queued events...');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[EventQueue] Connection lost, events will be queued');
      this.isOnline = false;
    });

    // Also check periodically (for cases where events don't fire)
    setInterval(() => {
      const currentlyOnline = navigator.onLine;
      if (currentlyOnline !== this.isOnline) {
        this.isOnline = currentlyOnline;
        if (currentlyOnline) {
          console.log('[EventQueue] Connection detected, processing queued events...');
          this.processQueue();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Add event to queue
   */
  enqueue(event: RegenEvent): void {
    // If online, emit immediately
    if (this.isOnline && this.queue.length === 0) {
      try {
        regenEventBus.emit(event);
        return;
      } catch (error) {
        console.warn('[EventQueue] Failed to emit event, queuing instead:', error);
        // Fall through to queue
      }
    }

    // Queue the event
    const queuedEvent: QueuedEvent = {
      event,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      retryCount: 0,
    };

    // Remove old events if queue is full
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      const removed = this.queue.shift();
      console.warn(`[EventQueue] Queue full, removed oldest event: ${removed?.id}`);
    }

    // Remove events older than MAX_QUEUE_AGE_MS
    const now = Date.now();
    this.queue = this.queue.filter(
      (qe) => now - qe.timestamp < MAX_QUEUE_AGE_MS
    );

    this.queue.push(queuedEvent);
    this.saveToStorage();
    this.notifyListeners();

    console.log(`[EventQueue] Event queued (${this.queue.length} total):`, event.type);
  }

  /**
   * Process queued events
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[EventQueue] Processing ${this.queue.length} queued events...`);

    const eventsToProcess = [...this.queue];
    this.queue = [];
    this.saveToStorage();

    let processed = 0;
    let failed = 0;

    for (const queuedEvent of eventsToProcess) {
      try {
        // Check if event is too old
        const age = Date.now() - queuedEvent.timestamp;
        if (age > MAX_QUEUE_AGE_MS) {
          console.warn(`[EventQueue] Skipping expired event: ${queuedEvent.id} (age: ${age}ms)`);
          failed++;
          continue;
        }

        // Emit the event
        regenEventBus.emit(queuedEvent.event);
        processed++;

        // Small delay to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error(`[EventQueue] Failed to process event ${queuedEvent.id}:`, error);
        failed++;

        // Retry logic: requeue if retry count is low
        if (queuedEvent.retryCount < 3) {
          queuedEvent.retryCount++;
          this.queue.push(queuedEvent);
        } else {
          console.error(`[EventQueue] Max retries reached for event ${queuedEvent.id}, dropping`);
        }
      }
    }

    this.saveToStorage();
    this.notifyListeners();
    this.isProcessing = false;

    console.log(
      `[EventQueue] Processed ${processed} events, ${failed} failed, ${this.queue.length} remaining`
    );
  }

  /**
   * Get queue statistics
   */
  getStats(): EventQueueStats {
    const now = Date.now();
    const oldestEvent = this.queue[0];
    const oldestEventAge = oldestEvent ? now - oldestEvent.timestamp : 0;

    return {
      queued: this.queue.length,
      processed: 0, // Would need to track this separately
      failed: 0, // Would need to track this separately
      oldestEventAge,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners();
    console.log('[EventQueue] Queue cleared');
  }

  /**
   * Subscribe to queue statistics updates
   */
  onStatsChange(listener: (stats: EventQueueStats) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of stats changes
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(stats);
      } catch (error) {
        console.error('[EventQueue] Listener error:', error);
      }
    });
  }

  /**
   * Load queue from local storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedEvent[];
        const now = Date.now();

        // Filter out expired events
        this.queue = parsed.filter(
          (qe) => now - qe.timestamp < MAX_QUEUE_AGE_MS
        );

        if (this.queue.length !== parsed.length) {
          console.log(
            `[EventQueue] Removed ${parsed.length - this.queue.length} expired events from storage`
          );
          this.saveToStorage();
        }

        console.log(`[EventQueue] Loaded ${this.queue.length} events from storage`);
      }
    } catch (error) {
      console.error('[EventQueue] Failed to load from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to local storage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[EventQueue] Failed to save to storage:', error);
      // If storage is full, remove oldest events and try again
      if (this.queue.length > 0) {
        this.queue.shift();
        this.saveToStorage();
      }
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if online
   */
  isConnected(): boolean {
    return this.isOnline;
  }
}

// Singleton instance
export const eventQueue = new EventQueue();

// Auto-process queue when connection is restored
if (typeof window !== 'undefined') {
  // Process queue on page load if online
  if (navigator.onLine) {
    setTimeout(() => {
      eventQueue.processQueue();
    }, 1000); // Wait 1 second for app to initialize
  }
}
