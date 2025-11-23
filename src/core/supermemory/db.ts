/**
 * SuperMemory Database - IndexedDB implementation with migrations
 * Handles events, embeddings, and vector storage
 */

import type { MemoryEvent } from './event-types';

// Re-export for convenience
export type { MemoryEvent } from './event-types';

export interface EmbeddingRecord {
  id: string;
  eventId: string;
  vector: number[]; // Vector embedding
  text: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

const DB_NAME = 'supermemory';
const DB_VERSION = 2; // Increment for migrations

class SuperMemoryDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize database with migrations
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB not available');
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion || 0;

        // Migration: Version 0 → 1 (initial schema)
        if (oldVersion < 1) {
          // Create events store
          if (!db.objectStoreNames.contains('events')) {
            const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
            eventsStore.createIndex('type', 'type', { unique: false });
            eventsStore.createIndex('ts', 'ts', { unique: false });
            eventsStore.createIndex('score', 'score', { unique: false });
          }
        }

        // Migration: Version 1 → 2 (add embeddings store and tags index)
        if (oldVersion < 2) {
          // Create embeddings store
          if (!db.objectStoreNames.contains('embeddings')) {
            const embeddingsStore = db.createObjectStore('embeddings', { keyPath: 'id' });
            embeddingsStore.createIndex('eventId', 'eventId', { unique: false });
            embeddingsStore.createIndex('timestamp', 'timestamp', { unique: false });
            // Note: Vector similarity search would require a vector index (not natively supported in IndexedDB)
            // For now, we'll do in-memory similarity search after loading vectors
          }

          // Add pinned index to events store using the existing upgrade transaction
          if (db.objectStoreNames.contains('events')) {
            const upgradeTx = (event.target as IDBOpenDBRequest).transaction;
            if (upgradeTx) {
              const eventsStore = upgradeTx.objectStore('events');
              if (!eventsStore.indexNames.contains('pinned')) {
                // IndexedDB requires indexes to be created during the upgrade transaction.
                // We intentionally skip creating a new index to avoid schema churn;
                // pinned filtering is handled in application code.
              }
            }
          }
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get database instance (ensure initialized)
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Save event to database
   */
  async saveEvent(event: MemoryEvent): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');

    return new Promise((resolve, reject) => {
      const request = store.put(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update event metadata (pin, tags, etc.)
   */
  async updateEventMetadata(
    eventId: string,
    updates: Partial<MemoryEvent['metadata']>
  ): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(eventId);
      getRequest.onsuccess = () => {
        const event = getRequest.result as MemoryEvent;
        if (!event) {
          reject(new Error('Event not found'));
          return;
        }

        // Merge metadata updates
        event.metadata = {
          ...event.metadata,
          ...updates,
        };

        const putRequest = store.put(event);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    const db = await this.getDB();
    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');

    const tags = new Set<string>();

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      request.onsuccess = e => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          const event = cursor.value as MemoryEvent;
          if (event.metadata?.tags) {
            for (const tag of event.metadata.tags) {
              tags.add(tag);
            }
          }
          cursor.continue();
        } else {
          resolve(Array.from(tags).sort());
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get events with filters
   */
  async getEvents(filters?: {
    type?: MemoryEvent['type'];
    limit?: number;
    since?: number;
    until?: number;
    pinned?: boolean;
    tags?: string[];
  }): Promise<MemoryEvent[]> {
    const db = await this.getDB();
    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const index = store.index('ts');

    const events: MemoryEvent[] = [];
    let range: IDBKeyRange | null = null;

    // Build key range
    if (filters?.since && filters?.until) {
      range = IDBKeyRange.bound(filters.since, filters.until);
    } else if (filters?.since) {
      range = IDBKeyRange.lowerBound(filters.since);
    } else if (filters?.until) {
      range = IDBKeyRange.upperBound(filters.until);
    }

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range, 'prev'); // Most recent first
      const limit = filters?.limit || 100;

      request.onsuccess = e => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor && events.length < limit) {
          const event = cursor.value as MemoryEvent;

          // Apply filters
          if (filters?.type && event.type !== filters.type) {
            cursor.continue();
            return;
          }

          if (
            filters?.pinned !== undefined &&
            (event.metadata?.pinned || false) !== filters.pinned
          ) {
            cursor.continue();
            return;
          }

          if (filters?.tags && filters.tags.length > 0) {
            const eventTags = event.metadata?.tags || [];
            const hasAllTags = filters.tags.every(tag => eventTags.includes(tag));
            if (!hasAllTags) {
              cursor.continue();
              return;
            }
          }

          events.push(event);
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save embedding to database
   */
  async saveEmbedding(embedding: EmbeddingRecord): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readwrite');
    const store = transaction.objectStore('embeddings');

    return new Promise((resolve, reject) => {
      const request = store.put(embedding);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get embeddings for an event
   */
  async getEmbeddingsForEvent(eventId: string): Promise<EmbeddingRecord[]> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readonly');
    const store = transaction.objectStore('embeddings');
    const index = store.index('eventId');

    const embeddings: EmbeddingRecord[] = [];

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(eventId));

      request.onsuccess = e => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          embeddings.push(cursor.value as EmbeddingRecord);
          cursor.continue();
        } else {
          resolve(embeddings);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all embeddings (for vector search)
   * Note: In production, use a proper vector database for efficient similarity search
   */
  async getAllEmbeddings(limit?: number): Promise<EmbeddingRecord[]> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readonly');
    const store = transaction.objectStore('embeddings');
    const index = store.index('timestamp');

    const embeddings: EmbeddingRecord[] = [];
    const maxLimit = limit || 1000;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Most recent first

      request.onsuccess = e => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor && embeddings.length < maxLimit) {
          embeddings.push(cursor.value as EmbeddingRecord);
          cursor.continue();
        } else {
          resolve(embeddings);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete embeddings for an event
   */
  async deleteEmbeddingsForEvent(eventId: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readwrite');
    const store = transaction.objectStore('embeddings');
    const index = store.index('eventId');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(eventId));

      request.onsuccess = e => {
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
  }

  /**
   * Get a single embedding by ID
   */
  async getEmbedding(id: string): Promise<EmbeddingRecord | null> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readonly');
    const store = transaction.objectStore('embeddings');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve((request.result as EmbeddingRecord) || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a single embedding by ID
   */
  async deleteEmbedding(id: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readwrite');
    const store = transaction.objectStore('embeddings');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete embeddings by event ID (alias for deleteEmbeddingsForEvent)
   */
  async deleteEmbeddingsByEventId(eventId: string): Promise<void> {
    await this.deleteEmbeddingsForEvent(eventId);
  }

  /**
   * Get total embedding count
   */
  async getEmbeddingCount(): Promise<number> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readonly');
    const store = transaction.objectStore('embeddings');

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all embeddings
   */
  async clearEmbeddings(): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['embeddings'], 'readwrite');
    const store = transaction.objectStore('embeddings');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete event and its embeddings
   */
  async deleteEvent(eventId: string): Promise<void> {
    const db = await this.getDB();

    // Delete embeddings first
    await this.deleteEmbeddingsForEvent(eventId);

    // Delete event
    const transaction = db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');

    return new Promise((resolve, reject) => {
      const request = store.delete(eventId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old events and embeddings
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    const db = await this.getDB();
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    // Cleanup old events
    const eventsTransaction = db.transaction(['events'], 'readwrite');
    const eventsStore = eventsTransaction.objectStore('events');
    const eventsIndex = eventsStore.index('ts');
    const eventsRange = IDBKeyRange.upperBound(cutoff);

    await new Promise<void>((resolve, reject) => {
      const request = eventsIndex.openCursor(eventsRange);
      request.onsuccess = e => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          const event = cursor.value as MemoryEvent;
          // Delete embeddings for this event
          this.deleteEmbeddingsForEvent(event.id).catch(console.warn);
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Cleanup old embeddings
    const embeddingsTransaction = db.transaction(['embeddings'], 'readwrite');
    const embeddingsStore = embeddingsTransaction.objectStore('embeddings');
    const embeddingsIndex = embeddingsStore.index('timestamp');
    const embeddingsRange = IDBKeyRange.upperBound(cutoff);

    await new Promise<void>((resolve, reject) => {
      const request = embeddingsIndex.openCursor(embeddingsRange);
      request.onsuccess = e => {
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
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    eventCount: number;
    embeddingCount: number;
    totalSize: number; // Approximate size in bytes
  }> {
    const db = await this.getDB();

    // Count events
    const eventsTransaction = db.transaction(['events'], 'readonly');
    const eventsStore = eventsTransaction.objectStore('events');
    const eventCount = await new Promise<number>((resolve, reject) => {
      const request = eventsStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Count embeddings
    const embeddingsTransaction = db.transaction(['embeddings'], 'readonly');
    const embeddingsStore = embeddingsTransaction.objectStore('embeddings');
    const embeddingCount = await new Promise<number>((resolve, reject) => {
      const request = embeddingsStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Estimate size (rough calculation)
    const sampleEvents = await this.getEvents({ limit: 10 });
    const sampleEmbeddings = await this.getAllEmbeddings(10);
    const avgEventSize = sampleEvents.length > 0 ? JSON.stringify(sampleEvents[0]).length : 500;
    const avgEmbeddingSize =
      sampleEmbeddings.length > 0 ? JSON.stringify(sampleEmbeddings[0]).length : 2000;

    const totalSize = eventCount * avgEventSize + embeddingCount * avgEmbeddingSize;

    return { eventCount, embeddingCount, totalSize };
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB();

    const transaction = db.transaction(['events', 'embeddings'], 'readwrite');
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('events').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('embeddings').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]);
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<MemoryEvent | null> {
    const db = await this.getDB();
    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');

    return new Promise((resolve, reject) => {
      const request = store.get(eventId);
      request.onsuccess = () => resolve((request.result as MemoryEvent) || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get multiple events by IDs (preserves order of IDs)
   */
  async getEventsByIds(ids: string[]): Promise<MemoryEvent[]> {
    if (ids.length === 0) return [];
    const db = await this.getDB();
    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const results = new Map<string, MemoryEvent>();

    await Promise.all(
      ids.map(
        id =>
          new Promise<void>((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => {
              if (request.result) {
                results.set(id, request.result as MemoryEvent);
              }
              resolve();
            };
            request.onerror = () => reject(request.error);
          })
      )
    );

    return ids.map(id => results.get(id)).filter((event): event is MemoryEvent => Boolean(event));
  }
}

// Singleton instance
export const superMemoryDB = new SuperMemoryDB();

// Initialize on load
if (typeof window !== 'undefined') {
  superMemoryDB.init().catch(error => {
    console.warn('[SuperMemoryDB] Failed to initialize:', error);
  });
}
