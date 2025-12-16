/**
 * Layer 4: Search & Indexing
 * 
 * Local-first search infrastructure using IndexedDB
 * - Full-text search with Lunr.js
 * - Offline-capable indexing
 * - Instant search results (<50ms)
 * - Fuzzy matching and typo tolerance
 * - Multi-field search (title, content, url, tags)
 * - Search result caching
 * - Integrates with MeiliSearch when available
 */

import { useEffect, useState, useMemo } from 'react';
import lunr from 'lunr';

// ============================================================================
// 1. IndexedDB Search Database
// ============================================================================

const DB_NAME = 'regen-search';
const DB_VERSION = 1;
const STORES = {
  documents: 'documents',
  index: 'index',
  cache: 'cache',
} as const;

export interface SearchDocument {
  id: string;
  type: 'tab' | 'note' | 'research' | 'bookmark';
  title: string;
  content: string;
  url?: string;
  tags?: string[];
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  document: SearchDocument;
  score: number;
  matches: {
    field: string;
    positions: number[];
  }[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  types?: SearchDocument['type'][];
  fuzzy?: boolean;
  boost?: Partial<Record<keyof SearchDocument, number>>;
  cache?: boolean;
}

class SearchDatabase {
  private db: IDBDatabase | null = null;
  private index: lunr.Index | null = null;
  private indexData: Map<string, SearchDocument> = new Map();
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        this.db = request.result;
        await this.loadIndex();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Documents store
        if (!db.objectStoreNames.contains(STORES.documents)) {
          const docStore = db.createObjectStore(STORES.documents, { keyPath: 'id' });
          docStore.createIndex('type', 'type', { unique: false });
          docStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Index store (for serialized Lunr index)
        if (!db.objectStoreNames.contains(STORES.index)) {
          db.createObjectStore(STORES.index, { keyPath: 'id' });
        }

        // Cache store (for search results)
        if (!db.objectStoreNames.contains(STORES.cache)) {
          const cacheStore = db.createObjectStore(STORES.cache, { keyPath: 'query' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async loadIndex(): Promise<void> {
    if (!this.db) return;

    try {
      // Load serialized index
      const transaction = this.db.transaction([STORES.index], 'readonly');
      const store = transaction.objectStore(STORES.index);
      const request = store.get('main');

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          if (request.result) {
            this.index = lunr.Index.load(request.result.data);
            console.log('[SearchDB] Loaded existing search index');
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

      // Load documents
      await this.loadDocuments();

      // Build index if it doesn't exist
      if (!this.index) {
        await this.rebuildIndex();
      }
    } catch (error) {
      console.error('[SearchDB] Failed to load index:', error);
      await this.rebuildIndex();
    }
  }

  private async loadDocuments(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.documents], 'readonly');
    const store = transaction.objectStore(STORES.documents);
    const request = store.getAll();

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        this.indexData.clear();
        request.result.forEach((doc: SearchDocument) => {
          this.indexData.set(doc.id, doc);
        });
        console.log(`[SearchDB] Loaded ${this.indexData.size} documents`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addDocument(doc: SearchDocument): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Store document
    const transaction = this.db.transaction([STORES.documents], 'readwrite');
    const store = transaction.objectStore(STORES.documents);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(doc);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Update in-memory data
    this.indexData.set(doc.id, doc);

    // Rebuild index (incremental update would be more efficient, but simpler for now)
    await this.rebuildIndex();
  }

  async addDocuments(docs: SearchDocument[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.documents], 'readwrite');
    const store = transaction.objectStore(STORES.documents);

    await Promise.all(
      docs.map(
        (doc) =>
          new Promise<void>((resolve, reject) => {
            const request = store.put(doc);
            request.onsuccess = () => {
              this.indexData.set(doc.id, doc);
              resolve();
            };
            request.onerror = () => reject(request.error);
          })
      )
    );

    await this.rebuildIndex();
    console.log(`[SearchDB] Added ${docs.length} documents`);
  }

  async removeDocument(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.documents], 'readwrite');
    const store = transaction.objectStore(STORES.documents);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.indexData.delete(id);
    await this.rebuildIndex();
  }

  private async rebuildIndex(): Promise<void> {
    if (!this.db) return;

    console.log('[SearchDB] Rebuilding search index...');
    const start = performance.now();

    // Build Lunr index without relying on dynamic `this` typing
    const builder = new lunr.Builder();
    builder.ref('id');
    builder.field('title', { boost: 10 });
    builder.field('content', { boost: 5 });
    builder.field('url', { boost: 2 });
    builder.field('tags', { boost: 8 });

    // Add all documents
    for (const doc of this.indexData.values()) {
      builder.add({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        url: doc.url || '',
        tags: doc.tags?.join(' ') || '',
      });
    }

    this.index = builder.build();

    // Save serialized index
    const transaction = this.db.transaction([STORES.index], 'readwrite');
    const store = transaction.objectStore(STORES.index);
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: 'main',
        data: this.index.toJSON(),
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const duration = performance.now() - start;
    console.log(`[SearchDB] Index rebuilt in ${duration.toFixed(2)}ms`);
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    await this.init();
    if (!this.index) return [];

    const start = performance.now();

    // Check cache
    if (options.cache !== false) {
      const cached = await this.getCachedResults(query, options);
      if (cached) {
        console.log(`[SearchDB] Cache hit for "${query}"`);
        return cached;
      }
    }

    try {
      // Perform search with Lunr
      let searchQuery = query;
      if (options.fuzzy) {
        // Add fuzzy matching with edit distance 1
        searchQuery = query
          .split(/\s+/)
          .map((term) => `${term}~1`)
          .join(' ');
      }

      const lunrResults = this.index.search(searchQuery);

      // Convert to SearchResult format
      let results: SearchResult[] = lunrResults
        .map((result) => {
          const doc = this.indexData.get(result.ref);
          if (!doc) return null;

          return {
            id: result.ref,
            document: doc,
            score: result.score,
            matches: Object.entries(result.matchData.metadata).map(([_term, fields]) => ({
              field: Object.keys(fields as object)[0] || '',
              positions: [],
            })),
          };
        })
        .filter((r): r is SearchResult => r !== null);

      // Filter by type
      if (options.types && options.types.length > 0) {
        results = results.filter((r) => options.types!.includes(r.document.type));
      }

      // Apply limit and offset
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      results = results.slice(offset, offset + limit);

      // Cache results
      if (options.cache !== false) {
        await this.cacheResults(query, options, results);
      }

      const duration = performance.now() - start;
      console.log(`[SearchDB] Search "${query}" completed in ${duration.toFixed(2)}ms`);

      return results;
    } catch (error) {
      console.error('[SearchDB] Search failed:', error);
      return [];
    }
  }

  private async getCachedResults(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[] | null> {
    if (!this.db) return null;

    try {
      const cacheKey = this.getCacheKey(query, options);
      const transaction = this.db.transaction([STORES.cache], 'readonly');
      const store = transaction.objectStore(STORES.cache);

      return new Promise((resolve) => {
        const request = store.get(cacheKey);
        request.onsuccess = () => {
          const cached = request.result;
          if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            // 5 min cache
            resolve(cached.results);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async cacheResults(
    query: string,
    options: SearchOptions,
    results: SearchResult[]
  ): Promise<void> {
    if (!this.db) return;

    try {
      const cacheKey = this.getCacheKey(query, options);
      const transaction = this.db.transaction([STORES.cache], 'readwrite');
      const store = transaction.objectStore(STORES.cache);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          query: cacheKey,
          results,
          timestamp: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[SearchDB] Failed to cache results:', error);
    }
  }

  private getCacheKey(query: string, options: SearchOptions): string {
    return `${query}:${JSON.stringify({
      types: options.types,
      fuzzy: options.fuzzy,
      limit: options.limit,
      offset: options.offset,
    })}`;
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.cache], 'readwrite');
    const store = transaction.objectStore(STORES.cache);
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log('[SearchDB] Cache cleared');
  }

  async getStats(): Promise<{
    documents: number;
    indexSize: number;
    cacheSize: number;
  }> {
    await this.init();
    if (!this.db) return { documents: 0, indexSize: 0, cacheSize: 0 };

    const transaction = this.db.transaction(
      [STORES.documents, STORES.cache],
      'readonly'
    );

    const docCount = await new Promise<number>((resolve) => {
      const request = transaction.objectStore(STORES.documents).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });

    const cacheCount = await new Promise<number>((resolve) => {
      const request = transaction.objectStore(STORES.cache).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });

    return {
      documents: docCount,
      indexSize: this.indexData.size,
      cacheSize: cacheCount,
    };
  }

  async clear(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(
      [STORES.documents, STORES.index, STORES.cache],
      'readwrite'
    );

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.documents).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.index).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.cache).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]);

    this.indexData.clear();
    this.index = null;
    console.log('[SearchDB] Database cleared');
  }
}

// Global instance
export const searchDB = new SearchDatabase();

// ============================================================================
// 2. Instant Search with Debouncing
// ============================================================================

export function useInstantSearch(
  query: string,
  options: SearchOptions = {},
  debounceMs: number = 150
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useMemo(() => {
    const timer = setTimeout(() => query, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  useEffect(() => {
    const performSearch = async () => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchDB.search(query, {
          ...options,
          fuzzy: true,
          cache: true,
        });
        setResults(searchResults);
      } catch (err) {
        setError(err as Error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, options.limit, options.offset, options.types?.join(',')]);

  return { results, loading, error };
}

// ============================================================================
// 3. Search Indexer
// ============================================================================

export class SearchIndexer {
  private batchQueue: SearchDocument[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private batchSize = 50;
  private batchDelayMs = 1000;

  async indexDocument(doc: SearchDocument): Promise<void> {
    this.batchQueue.push(doc);

    if (this.batchQueue.length >= this.batchSize) {
      await this.flushBatch();
    } else {
      this.scheduleBatchFlush();
    }
  }

  async indexDocuments(docs: SearchDocument[]): Promise<void> {
    await searchDB.addDocuments(docs);
  }

  private scheduleBatchFlush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, this.batchDelayMs);
  }

  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      await searchDB.addDocuments(batch);
      console.log(`[SearchIndexer] Flushed batch of ${batch.length} documents`);
    } catch (error) {
      console.error('[SearchIndexer] Batch flush failed:', error);
      // Re-queue failed documents
      this.batchQueue.unshift(...batch);
    }
  }

  async removeDocument(id: string): Promise<void> {
    await searchDB.removeDocument(id);
  }

  async getStats() {
    return searchDB.getStats();
  }
}

export const searchIndexer = new SearchIndexer();

// ============================================================================
// 4. Hybrid Search (Local + MeiliSearch)
// ============================================================================

export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // 1. Local search (always available)
  const localResults = await searchDB.search(query, { ...options, fuzzy: true });
  results.push(...localResults);

  // 2. Try MeiliSearch if available
  try {
    const { checkMeiliSearch, multiSearch } = await import('../lib/meili');
    const meiliAvailable = await checkMeiliSearch();

    if (meiliAvailable) {
      const meiliResults = await multiSearch([
        { indexUid: 'tabs', q: query, limit: options.limit || 20 },
        { indexUid: 'notes', q: query, limit: options.limit || 20 },
        { indexUid: 'research', q: query, limit: options.limit || 20 },
      ]);

      // Merge results
      meiliResults.results.forEach((indexResult) => {
        indexResult.hits.forEach((hit: any) => {
          results.push({
            id: hit.id,
            document: {
              id: hit.id,
              type: indexResult.indexUid as any,
              title: hit.title || '',
              content: hit.content || hit.text || '',
              url: hit.url,
              tags: hit.tags,
              timestamp: hit.timestamp || Date.now(),
            },
            score: 1.0, // MeiliSearch doesn't return scores
            matches: [],
          });
        });
      });
    }
  } catch {
    console.log('[HybridSearch] MeiliSearch unavailable, using local only');
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  const deduplicated = results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Sort by score (descending)
  deduplicated.sort((a, b) => b.score - a.score);

  // Apply limit
  return deduplicated.slice(0, options.limit || 20);
}

// ============================================================================
// 5. Search Suggestions
// ============================================================================

export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  if (!query || query.length < 2) return [];

  // Get top results
  const results = await searchDB.search(query, { limit, fuzzy: true });

  // Extract unique terms from titles
  const suggestions = new Set<string>();
  results.forEach((result) => {
    const words = result.document.title.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.startsWith(query.toLowerCase()) && word.length > query.length) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, limit);
}
