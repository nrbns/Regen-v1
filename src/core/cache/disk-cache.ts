/**
 * Persistent Disk Cache - Tier 2
 * Uses IndexedDB for persistent storage with TTL support
 */

export interface DiskCacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

const DB_NAME = 'omnibrowser_cache';
const STORE_NAME = 'cache_entries';
const DB_VERSION = 1;

export class DiskCache<T = unknown> {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[DiskCache] Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
  }

  /**
   * Get value from disk cache
   */
  async get(key: string): Promise<T | null> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as DiskCacheEntry<T> | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          // Expired, delete and return null
          this.delete(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve(entry.value);
      };

      request.onerror = () => {
        reject(new Error('Failed to read from cache'));
      };
    });
  }

  /**
   * Set value in disk cache
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    await this.ensureReady();

    const entry: DiskCacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to write to cache'));
      };
    });
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete from cache'));
      };
    });
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear cache'));
      };
    });
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      let deleted = 0;

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as DiskCacheEntry<T>;
          if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to clean expired entries'));
      };
    });
  }
}
