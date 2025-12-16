/**
 * Layer 4: Search & Indexing Tests
 * Tests for IndexedDB search, instant search, and hybrid search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchDB, searchIndexer, SearchDocument, hybridSearch } from '../utils/layer4-search';
import {
  indexTab,
  indexTabs,
  indexBookmark,
  indexNote,
  performSearch,
  rebuildSearchIndex,
} from '../services/searchIntegration';

// Mock IndexedDB
const mockIDB = {
  databases: new Map<string, any>(),
  open: vi.fn((_name: string, _version: number) => {
    const request = {
      result: null,
      error: null,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    };

    setTimeout(() => {
      const db = {
        objectStoreNames: { contains: vi.fn(() => false) },
        createObjectStore: vi.fn(() => ({
          createIndex: vi.fn(),
        })),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
            getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
            put: vi.fn(() => ({ onsuccess: null, onerror: null })),
            delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
            clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
            count: vi.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
          })),
        })),
      };

      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: db } } as any);
      }

      request.result = db;
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }),
};

global.indexedDB = mockIDB as any;

describe('Layer 4: SearchDatabase', () => {
  beforeEach(async () => {
    mockIDB.databases.clear();
  });

  it('should initialize database', async () => {
    await searchDB.init();
    expect(mockIDB.open).toHaveBeenCalledWith('regen-search', 1);
  });

  it('should add single document', async () => {
    const doc: SearchDocument = {
      id: 'test-1',
      type: 'tab',
      title: 'Test Tab',
      content: 'https://example.com',
      url: 'https://example.com',
      timestamp: Date.now(),
    };

    await expect(searchDB.addDocument(doc)).resolves.not.toThrow();
  });

  it('should add multiple documents in batch', async () => {
    const docs: SearchDocument[] = [
      {
        id: 'test-1',
        type: 'tab',
        title: 'Tab 1',
        content: 'Content 1',
        timestamp: Date.now(),
      },
      {
        id: 'test-2',
        type: 'note',
        title: 'Note 1',
        content: 'Note content',
        timestamp: Date.now(),
      },
    ];

    await expect(searchDB.addDocuments(docs)).resolves.not.toThrow();
  });

  it('should search documents', async () => {
    const results = await searchDB.search('test', { limit: 10 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should apply type filter', async () => {
    const results = await searchDB.search('test', {
      types: ['tab'],
      limit: 10,
    });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should cache search results', async () => {
    const query = 'cached query';
    
    // First search - should cache
    await searchDB.search(query, { cache: true, limit: 5 });
    
    // Second search - should hit cache
    const start = performance.now();
    await searchDB.search(query, { cache: true, limit: 5 });
    const duration = performance.now() - start;
    
    // Cache hit should be very fast (<10ms)
    expect(duration).toBeLessThan(10);
  });

  it('should remove document', async () => {
    await expect(searchDB.removeDocument('test-1')).resolves.not.toThrow();
  });

  it('should get database statistics', async () => {
    const stats = await searchDB.getStats();
    expect(stats).toHaveProperty('documents');
    expect(stats).toHaveProperty('indexSize');
    expect(stats).toHaveProperty('cacheSize');
  });

  it('should clear cache', async () => {
    await expect(searchDB.clearCache()).resolves.not.toThrow();
  });

  it('should clear entire database', async () => {
    await expect(searchDB.clear()).resolves.not.toThrow();
  });
});

describe('Layer 4: SearchIndexer', () => {
  it('should index single document', async () => {
    const doc: SearchDocument = {
      id: 'doc-1',
      type: 'note',
      title: 'Test Note',
      content: 'Note content here',
      timestamp: Date.now(),
    };

    await expect(searchIndexer.indexDocument(doc)).resolves.not.toThrow();
  });

  it('should batch index documents', async () => {
    const docs: SearchDocument[] = Array.from({ length: 100 }, (_, i) => ({
      id: `doc-${i}`,
      type: 'tab' as const,
      title: `Tab ${i}`,
      content: `Content ${i}`,
      timestamp: Date.now(),
    }));

    await expect(searchIndexer.indexDocuments(docs)).resolves.not.toThrow();
  });

  it('should get indexer statistics', async () => {
    const stats = await searchIndexer.getStats();
    expect(stats).toHaveProperty('documents');
  });
});

describe('Layer 4: Search Integration', () => {
  const mockTab = {
    id: 'tab-1',
    title: 'Example Tab',
    url: 'https://example.com',
    favicon: 'https://example.com/favicon.ico',
    active: false,
  };

  it('should index tab', async () => {
    await expect(indexTab(mockTab)).resolves.not.toThrow();
  });

  it('should index multiple tabs', async () => {
    const tabs = Array.from({ length: 10 }, (_, i) => ({
      ...mockTab,
      id: `tab-${i}`,
      title: `Tab ${i}`,
    }));

    await expect(indexTabs(tabs)).resolves.not.toThrow();
  });

  it('should index bookmark', async () => {
    const bookmark = {
      id: 'bookmark-1',
      title: 'Example Bookmark',
      url: 'https://example.com',
      tags: ['example', 'test'],
    };

    await expect(indexBookmark(bookmark)).resolves.not.toThrow();
  });

  it('should index note', async () => {
    const note = {
      id: 'note-1',
      title: 'My Note',
      content: 'Note content goes here',
      tags: ['personal'],
    };

    await expect(indexNote(note)).resolves.not.toThrow();
  });

  it('should perform search', async () => {
    const results = await performSearch('example', { limit: 10 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should rebuild entire search index', async () => {
    const data = {
      tabs: [mockTab],
      bookmarks: [],
      notes: [],
      research: [],
    };

    await expect(rebuildSearchIndex(data)).resolves.not.toThrow();
  });
});

describe('Layer 4: Hybrid Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform hybrid search (local + MeiliSearch)', async () => {
    const results = await hybridSearch('test query', { limit: 20 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should fallback to local search if MeiliSearch unavailable', async () => {
    // Mock MeiliSearch as unavailable
    vi.mock('../lib/meili', () => ({
      checkMeiliSearch: vi.fn(() => Promise.resolve(false)),
      multiSearch: vi.fn(() => Promise.reject(new Error('Unavailable'))),
    }));

    const results = await hybridSearch('test', { limit: 10 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should deduplicate results from multiple sources', async () => {
    // This test verifies that hybrid search removes duplicates
    const results = await hybridSearch('test', { limit: 20 });
    const ids = new Set(results.map(r => r.id));
    expect(ids.size).toBe(results.length); // No duplicates
  });
});

describe('Layer 4: Performance Benchmarks', () => {
  it('should complete search in <50ms', async () => {
    const start = performance.now();
    await searchDB.search('test query', { limit: 20 });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it('should index 100 documents in <200ms', async () => {
    const docs: SearchDocument[] = Array.from({ length: 100 }, (_, i) => ({
      id: `perf-doc-${i}`,
      type: 'tab',
      title: `Performance Test ${i}`,
      content: `Content for performance test document ${i}`,
      timestamp: Date.now(),
    }));

    const start = performance.now();
    await searchIndexer.indexDocuments(docs);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
  });

  it('should cache lookup in <10ms', async () => {
    // First search to populate cache
    await searchDB.search('cache test', { cache: true });

    // Second search should hit cache
    const start = performance.now();
    await searchDB.search('cache test', { cache: true });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('should rebuild index of 1000 documents in <500ms', async () => {
    const data = {
      tabs: Array.from({ length: 1000 }, (_, i) => ({
        id: `tab-${i}`,
        title: `Tab ${i}`,
        url: `https://example.com/${i}`,
        active: false,
      })),
    };

    const start = performance.now();
    await rebuildSearchIndex(data);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });
});

describe('Layer 4: Fuzzy Search', () => {
  it('should find results with typos', async () => {
    const doc: SearchDocument = {
      id: 'fuzzy-1',
      type: 'note',
      title: 'JavaScript Programming',
      content: 'Learn JavaScript and web development',
      timestamp: Date.now(),
    };

    await searchDB.addDocument(doc);

    // Search with typo: "javascrpt" instead of "javascript"
    const results = await searchDB.search('javascrpt', { fuzzy: true });
    
    // Should still find the document despite typo
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle partial matches', async () => {
    const doc: SearchDocument = {
      id: 'partial-1',
      type: 'tab',
      title: 'TypeScript Documentation',
      content: 'Complete guide to TypeScript',
      timestamp: Date.now(),
    };

    await searchDB.addDocument(doc);

    // Partial search
    const results = await searchDB.search('types', { fuzzy: true });
    expect(results.length).toBeGreaterThan(0);
  });
});
