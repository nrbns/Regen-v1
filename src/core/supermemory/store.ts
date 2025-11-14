/**
 * SuperMemory Store - Personal long-term memory & personalization layer
 * Uses localStorage with IndexedDB fallback for larger data
 */

export interface MemoryEvent {
  id: string;
  type: 'search' | 'visit' | 'mode_switch' | 'bookmark' | 'note' | 'prefetch' | 'action';
  value: any; // e.g. query string or url
  metadata?: {
    url?: string;
    title?: string;
    mode?: string;
    tabId?: string;
    duration?: number;
  };
  ts: number;
  score?: number; // recency/freq score
}

const STORAGE_PREFIX = 'sm-';
const MAX_EVENTS = 10000; // Limit total events
const MAX_EVENTS_PER_TYPE = 1000; // Limit per event type

class MemoryStore {
  private db: IDBDatabase | null = null;
  private useIndexedDB = false;

  /**
   * Initialize IndexedDB if available
   */
  async init(): Promise<void> {
    if (!('indexedDB' in window)) {
      this.useIndexedDB = false;
      return;
    }

    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('supermemory', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('events')) {
            const store = db.createObjectStore('events', { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('ts', 'ts', { unique: false });
          }
        };
      });
      this.useIndexedDB = true;
    } catch (error) {
      console.warn('[SuperMemory] IndexedDB unavailable, using localStorage:', error);
      this.useIndexedDB = false;
    }
  }

  /**
   * Get value from storage
   */
  get<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('[SuperMemory] Failed to get:', key, error);
      return null;
    }
  }

  /**
   * Set value in storage
   */
  set(key: string, value: any): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error('[SuperMemory] Failed to set:', key, error);
    }
  }

  /**
   * Push item to array in storage
   */
  push(key: string, item: any): void {
    try {
      const arr = this.get<any[]>(key) || [];
      arr.unshift(item); // Add to beginning
      
      // Limit array size
      if (arr.length > MAX_EVENTS) {
        arr.splice(MAX_EVENTS);
      }
      
      this.set(key, arr);
    } catch (error) {
      console.error('[SuperMemory] Failed to push:', key, error);
    }
  }

  /**
   * Save a memory event
   */
  async saveEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): Promise<string> {
    const fullEvent: MemoryEvent = {
      ...event,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ts: Date.now(),
      score: this.calculateScore(event),
    };

    if (this.useIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        await store.add(fullEvent);
        
        // Cleanup old events
        await this.cleanupOldEvents();
        return fullEvent.id;
      } catch (error) {
        console.warn('[SuperMemory] IndexedDB save failed, falling back to localStorage:', error);
        this.useIndexedDB = false;
      }
    }

    // Fallback to localStorage
    this.push('events', fullEvent);
    this.cleanupOldEventsSync();
    return fullEvent.id;
  }

  /**
   * Get events with optional filters
   */
  async getEvents(filters?: {
    type?: MemoryEvent['type'];
    limit?: number;
    since?: number;
  }): Promise<MemoryEvent[]> {
    if (this.useIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(['events'], 'readonly');
        const store = transaction.objectStore('events');
        const index = store.index('ts');
        
        const events: MemoryEvent[] = [];
        const range = filters?.since ? IDBKeyRange.lowerBound(filters.since) : null;
        
        return new Promise((resolve, reject) => {
          const request = index.openCursor(range, 'prev'); // Most recent first
          request.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor && events.length < (filters?.limit || 100)) {
              const event = cursor.value as MemoryEvent;
              if (!filters?.type || event.type === filters.type) {
                events.push(event);
              }
              cursor.continue();
            } else {
              resolve(events);
            }
          };
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('[SuperMemory] IndexedDB read failed, falling back to localStorage:', error);
        this.useIndexedDB = false;
      }
    }

    // Fallback to localStorage
    const allEvents = this.get<MemoryEvent[]>('events') || [];
    let filtered = allEvents;

    if (filters?.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }
    if (filters?.since) {
      filtered = filtered.filter(e => e.ts >= filters.since!);
    }

    return filtered.slice(0, filters?.limit || 100);
  }

  /**
   * Calculate recency + frequency score
   */
  private calculateScore(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): number {
    const allEvents = this.get<MemoryEvent[]>('events') || [];
    
    // Frequency: how many times this value appeared
    const frequency = allEvents.filter(e => 
      e.type === event.type && 
      JSON.stringify(e.value) === JSON.stringify(event.value)
    ).length;
    
    // Recency: newer events get higher score (decay over time)
    const now = Date.now();
    const recency = 1; // Current event is most recent
    
    // Combined score (frequency * 0.6 + recency * 0.4)
    return frequency * 0.6 + recency * 0.4;
  }

  /**
   * Cleanup old events (IndexedDB)
   */
  private async cleanupOldEvents(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const index = store.index('ts');
      
      // Delete events older than 90 days
      const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const range = IDBKeyRange.upperBound(cutoff);
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(range);
        request.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[SuperMemory] Cleanup failed:', error);
    }
  }

  /**
   * Cleanup old events (localStorage)
   */
  private cleanupOldEventsSync(): void {
    const events = this.get<MemoryEvent[]>('events') || [];
    
    // Remove events older than 90 days
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const filtered = events.filter(e => e.ts >= cutoff);
    
    // Limit total events
    if (filtered.length > MAX_EVENTS) {
      filtered.splice(MAX_EVENTS);
    }
    
    this.set('events', filtered);
  }

  /**
   * Delete all events
   */
  async forgetAll(): Promise<void> {
    if (this.useIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        await store.clear();
      } catch (error) {
        console.warn('[SuperMemory] Failed to clear IndexedDB:', error);
      }
    }
    
    localStorage.removeItem(STORAGE_PREFIX + 'events');
  }

  /**
   * Export all events (for user export)
   */
  async export(): Promise<MemoryEvent[]> {
    return this.getEvents({ limit: MAX_EVENTS });
  }
}

// Singleton instance
export const MemoryStore = new MemoryStore();

// Initialize on load
if (typeof window !== 'undefined') {
  MemoryStore.init().catch(console.error);
}

