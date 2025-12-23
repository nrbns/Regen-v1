/**
 * Event Ledger Store - Persistent Storage
 *
 * Stores all events in IndexedDB for persistence across:
 * - Restarts
 * - Crashes
 * - Offline periods
 *
 * This is your audit trail and replay capability.
 */

import type { EventLedgerEntry, EventLedgerQuery } from './types';

const DB_NAME = 'regen_event_ledger';
const DB_VERSION = 1;
const STORE_NAME = 'events';

class EventLedgerStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    if (this.db) return;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('jobId', 'jobId', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('jobId_timestamp', ['jobId', 'timestamp'], { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async append(entry: EventLedgerEntry): Promise<void> {
    await this.init();

    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to append event'));
    });
  }

  async query(query: EventLedgerQuery): Promise<EventLedgerEntry[]> {
    await this.init();

    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      let index: IDBIndex;

      // Choose index based on query
      if (query.jobId) {
        index = store.index('jobId_timestamp');
      } else if (query.type) {
        index = store.index('type');
      } else if (query.userId) {
        index = store.index('userId');
      } else {
        index = store.index('timestamp');
      }

      const range = this.buildRange(query);
      const request = index.openCursor(range, 'prev'); // Most recent first

      const results: EventLedgerEntry[] = [];
      let offset = query.offset || 0;
      let count = 0;

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (!cursor) {
          resolve(results);
          return;
        }

        // Apply offset
        if (offset > 0) {
          offset--;
          cursor.continue();
          return;
        }

        const entry = cursor.value as EventLedgerEntry;

        // Apply filters
        if (this.matchesQuery(entry, query)) {
          results.push(entry);
          count++;
        }

        if (query.limit && count >= query.limit) {
          resolve(results);
          return;
        }

        cursor.continue();
      };

      request.onerror = () => reject(new Error('Failed to query events'));
    });
  }

  async getByJobId(jobId: string): Promise<EventLedgerEntry[]> {
    return this.query({ jobId, limit: 10000 }); // Get all events for a job
  }

  async getLastEvent(jobId?: string): Promise<EventLedgerEntry | null> {
    const query: EventLedgerQuery = { limit: 1 };
    if (jobId) query.jobId = jobId;

    const results = await this.query(query);
    return results[0] || null;
  }

  private buildRange(query: EventLedgerQuery): IDBKeyRange | null {
    if (query.startTime && query.endTime) {
      return IDBKeyRange.bound(query.startTime, query.endTime);
    }
    if (query.startTime) {
      return IDBKeyRange.lowerBound(query.startTime);
    }
    if (query.endTime) {
      return IDBKeyRange.upperBound(query.endTime);
    }
    return null;
  }

  private matchesQuery(entry: EventLedgerEntry, query: EventLedgerQuery): boolean {
    if (query.jobId && entry.jobId !== query.jobId) return false;
    if (query.userId && entry.userId !== query.userId) return false;

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      if (!types.includes(entry.type)) return false;
    }

    if (query.startTime && entry.timestamp < query.startTime) return false;
    if (query.endTime && entry.timestamp > query.endTime) return false;

    return true;
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear events'));
    });
  }
}

export const eventLedgerStore = new EventLedgerStore();
