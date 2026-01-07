/**
 * Layer 4: Search Integration Service
 * 
 * Integrates Layer 4 local search with:
 * - Existing tab management (tabsStore)
 * - Layer 3 offline queue
 * - MeiliSearch fallback
 * - Research mode
 */

import { searchDB, searchIndexer, hybridSearch, SearchDocument } from '../utils/layer4-search';
import type { Tab } from '../state/tabsStore';
import { getOfflineQueue } from '../utils/layer3-network';

const offlineQueue = getOfflineQueue();

// ============================================================================
// 1. Tab Indexing Integration
// ============================================================================

/**
 * Index a tab for search
 */
export async function indexTab(tab: Tab): Promise<void> {
  const doc: SearchDocument = {
    id: tab.id,
    type: 'tab',
    title: tab.title || tab.url || 'Untitled',
    content: tab.url || '',
    url: tab.url,
    tags: [], // Could extract from tab metadata
    timestamp: Date.now(),
    metadata: {
      favicon: tab.favicon,
      active: tab.active,
    },
  };

  await searchIndexer.indexDocument(doc);
}

/**
 * Index multiple tabs in batch
 */
export async function indexTabs(tabs: Tab[]): Promise<void> {
  const docs: SearchDocument[] = tabs.map((tab) => ({
    id: tab.id,
    type: 'tab',
    title: tab.title || tab.url || 'Untitled',
    content: tab.url || '',
    url: tab.url,
    tags: [],
    timestamp: Date.now(),
    metadata: {
      favicon: tab.favicon,
      active: tab.active,
    },
  }));

  await searchIndexer.indexDocuments(docs);
}

/**
 * Remove tab from search index
 */
export async function removeTab(tabId: string): Promise<void> {
  await searchIndexer.removeDocument(tabId);
}

// ============================================================================
// 2. Bookmark Indexing
// ============================================================================

export async function indexBookmark(bookmark: {
  id: string;
  title: string;
  url: string;
  tags?: string[];
}): Promise<void> {
  const doc: SearchDocument = {
    id: bookmark.id,
    type: 'bookmark',
    title: bookmark.title,
    content: bookmark.url,
    url: bookmark.url,
    tags: bookmark.tags,
    timestamp: Date.now(),
  };

  await searchIndexer.indexDocument(doc);
}

// ============================================================================
// 3. Research Document Indexing
// ============================================================================

export async function indexResearchDocument(research: {
  id: string;
  title: string;
  content: string;
  url?: string;
  sources?: string[];
}): Promise<void> {
  const doc: SearchDocument = {
    id: research.id,
    type: 'research',
    title: research.title,
    content: research.content,
    url: research.url,
    tags: [],
    timestamp: Date.now(),
    metadata: {
      sources: research.sources,
    },
  };

  await searchIndexer.indexDocument(doc);
}

// ============================================================================
// 4. Note Indexing
// ============================================================================

export async function indexNote(note: {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}): Promise<void> {
  const doc: SearchDocument = {
    id: note.id,
    type: 'note',
    title: note.title,
    content: note.content,
    tags: note.tags,
    timestamp: Date.now(),
  };

  await searchIndexer.indexDocument(doc);
}

// ============================================================================
// 5. Offline Queue Integration (Layer 3)
// ============================================================================

/**
 * Queue search index update when offline
 */
export async function queueSearchIndexUpdate(
  doc: SearchDocument
): Promise<void> {
  if (!navigator.onLine) {
    // Queue the index operation for later
    await offlineQueue.add('/api/search/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    console.log('[SearchIntegration] Queued index update for offline processing');
  } else {
    // Index immediately
    await searchIndexer.indexDocument(doc);
  }
}

/**
 * Sync local search index with server when online
 */
export async function syncSearchIndex(): Promise<void> {
  if (!navigator.onLine) {
    console.log('[SearchIntegration] Cannot sync while offline');
    return;
  }

  try {
    // Get all indexed documents
    const stats = await searchIndexer.getStats();
    console.log(`[SearchIntegration] Syncing ${stats.documents} documents...`);

    // Trigger MeiliSearch re-indexing if available
    const { checkMeiliSearch } = await import('../lib/meili');
    const meiliAvailable = await checkMeiliSearch();

    if (meiliAvailable) {
      console.log('[SearchIntegration] MeiliSearch available, syncing...');
      // MeiliSearch will handle its own indexing via existing services
    } else {
      console.log('[SearchIntegration] MeiliSearch unavailable, local search only');
    }
  } catch (error) {
    console.error('[SearchIntegration] Sync failed:', error);
  }
}

// ============================================================================
// 6. Search with Offline Fallback
// ============================================================================

/**
 * Perform search with automatic fallback
 * - Try hybrid search (local + MeiliSearch)
 * - Fall back to local search if MeiliSearch fails
 * - Queue search analytics when offline
 */
export async function performSearch(
  query: string,
  options: {
    limit?: number;
    types?: ('tab' | 'note' | 'research' | 'bookmark')[];
  } = {}
) {
  try {
    // Use hybrid search for best results
    const results = await hybridSearch(query, {
      ...options,
      fuzzy: true,
      cache: true,
    });

    // Queue analytics (offline-safe)
    if (!navigator.onLine) {
      await offlineQueue.add('/api/analytics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          resultCount: results.length,
          timestamp: Date.now(),
        }),
      });
    }

    return results;
  } catch (error) {
    console.error('[SearchIntegration] Search failed:', error);
    // Fallback to local search only
    return searchDB.search(query, { ...options, fuzzy: true });
  }
}

// ============================================================================
// 7. Initialization
// ============================================================================

let initialized = false;

export async function initSearchIntegration(): Promise<void> {
  if (initialized) return;

  try {
    console.log('[SearchIntegration] Initializing Layer 4 search...');

    // Initialize IndexedDB
    await searchDB.init();

    // Get current stats
    const stats = await searchIndexer.getStats();
    console.log(
      `[SearchIntegration] Ready - ${stats.documents} documents indexed, ${stats.cacheSize} cached queries`
    );

    initialized = true;
  } catch (error) {
    console.error('[SearchIntegration] Initialization failed:', error);
  }
}

// ============================================================================
// 8. Bulk Operations
// ============================================================================

/**
 * Rebuild entire search index from current application state
 */
export async function rebuildSearchIndex(data: {
  tabs?: Tab[];
  bookmarks?: any[];
  notes?: any[];
  research?: any[];
}): Promise<void> {
  console.log('[SearchIntegration] Rebuilding search index...');
  const start = performance.now();

  // Clear existing index
  await searchDB.clear();

  const allDocs: SearchDocument[] = [];

  // Index tabs
  if (data.tabs) {
    data.tabs.forEach((tab) => {
      allDocs.push({
        id: tab.id,
        type: 'tab',
        title: tab.title || tab.url || 'Untitled',
        content: tab.url || '',
        url: tab.url,
        tags: [],
        timestamp: Date.now(),
      });
    });
  }

  // Index bookmarks
  if (data.bookmarks) {
    data.bookmarks.forEach((bookmark) => {
      allDocs.push({
        id: bookmark.id,
        type: 'bookmark',
        title: bookmark.title,
        content: bookmark.url,
        url: bookmark.url,
        tags: bookmark.tags || [],
        timestamp: Date.now(),
      });
    });
  }

  // Index notes
  if (data.notes) {
    data.notes.forEach((note) => {
      allDocs.push({
        id: note.id,
        type: 'note',
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        timestamp: Date.now(),
      });
    });
  }

  // Index research
  if (data.research) {
    data.research.forEach((doc) => {
      allDocs.push({
        id: doc.id,
        type: 'research',
        title: doc.title,
        content: doc.content,
        url: doc.url,
        tags: [],
        timestamp: Date.now(),
      });
    });
  }

  // Batch index all documents
  await searchIndexer.indexDocuments(allDocs);

  const duration = performance.now() - start;
  console.log(
    `[SearchIntegration] Rebuilt ${allDocs.length} documents in ${duration.toFixed(2)}ms`
  );
}

/**
 * Get search statistics
 */
export async function getSearchStats() {
  return searchIndexer.getStats();
}

/**
 * Clear search cache
 */
export async function clearSearchCache() {
  await searchDB.clearCache();
  console.log('[SearchIntegration] Search cache cleared');
}
