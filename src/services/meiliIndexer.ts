// MeiliSearch Auto-Indexing Service
// Automatically indexes tabs, research, notes as they're created/updated

import { indexDocuments, ensureIndex, checkMeiliSearch } from '../lib/meili';
import type { Tab } from '../state/tabsStore';

let meiliAvailable = false;
// FIX: Indexing is now opt-in only (disabled by default for privacy)
let indexingEnabled = false; // Default to false - requires explicit user consent

/**
 * Enable indexing (requires explicit user consent)
 */
export function enableIndexing(): void {
  indexingEnabled = true;
  console.log('[MeiliIndexer] Indexing enabled (user consent granted)');
}

/**
 * Disable indexing
 */
export function disableIndexing(): void {
  indexingEnabled = false;
  console.log('[MeiliIndexer] Indexing disabled');
}

/**
 * Check if indexing is enabled
 */
export function isIndexingEnabled(): boolean {
  return indexingEnabled && meiliAvailable;
}

/**
 * Initialize MeiliSearch indexing (only if opt-in enabled)
 */
export async function initMeiliIndexing(): Promise<void> {
  // FIX: Only initialize if user has explicitly enabled indexing
  if (!indexingEnabled) {
    console.log('[MeiliIndexer] Indexing skipped (opt-in not enabled)');
    return;
  }

  try {
    meiliAvailable = await checkMeiliSearch();
    if (meiliAvailable) {
      // Ensure indexes exist - suppress errors if MeiliSearch becomes unavailable
      try {
        await ensureIndex('tabs', 'id');
        await ensureIndex('research', 'id');
        await ensureIndex('notes', 'id');
        await ensureIndex('contexts', 'id');
        console.log('[MeiliIndexer] Indexes initialized (user consent granted)');
      } catch {
        // MeiliSearch not available or unauthorized - silently disable
        meiliAvailable = false;
        indexingEnabled = false;
        return;
      }
    } else {
      // MeiliSearch not available - silently disable indexing
      meiliAvailable = false;
      indexingEnabled = false;
    }
  } catch {
    // Suppress MeiliSearch errors - it's optional and may not be running
    meiliAvailable = false;
    indexingEnabled = false;
  }
}

/**
 * Index a single tab
 */
export async function indexTab(tab: Tab): Promise<void> {
  if (!meiliAvailable || !indexingEnabled) return;

  try {
    const doc = {
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      mode: tab.mode || 'normal',
      appMode: tab.appMode || 'Browse',
      createdAt: tab.createdAt || Date.now(),
      lastActiveAt: tab.lastActiveAt || Date.now(),
      tags: [tab.appMode?.toLowerCase() || 'browse', tab.mode || 'normal'],
    };

    await indexDocuments('tabs', [doc]);
  } catch (error) {
    // Suppress MeiliSearch errors - it's optional
    const errorMsg = String(error);
    if (!errorMsg.includes('401') && !errorMsg.includes('Unauthorized')) {
      console.error('[MeiliIndexer] Failed to index tab:', error);
    }
  }
}

/**
 * Index multiple tabs (batch)
 */
export async function indexTabs(tabs: Tab[]): Promise<void> {
  if (!meiliAvailable || !indexingEnabled || tabs.length === 0) return;

  try {
    const docs = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      mode: tab.mode || 'normal',
      appMode: tab.appMode || 'Browse',
      createdAt: tab.createdAt || Date.now(),
      lastActiveAt: tab.lastActiveAt || Date.now(),
      tags: [tab.appMode?.toLowerCase() || 'browse', tab.mode || 'normal'],
    }));

    await indexDocuments('tabs', docs);
    console.log(`[MeiliIndexer] Indexed ${tabs.length} tabs`);
  } catch (error) {
    // Suppress MeiliSearch errors - it's optional
    const errorMsg = String(error);
    if (!errorMsg.includes('401') && !errorMsg.includes('Unauthorized')) {
      console.error('[MeiliIndexer] Failed to index tabs:', error);
    }
  }
}

/**
 * Index research document
 */
export async function indexResearch(doc: {
  id: string;
  title: string;
  content: string;
  url?: string;
  tags?: string[];
  timestamp?: number;
}): Promise<void> {
  if (!meiliAvailable || !indexingEnabled) return;

  try {
    await indexDocuments('research', [
      {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        url: doc.url || '',
        tags: doc.tags || [],
        timestamp: doc.timestamp || Date.now(),
      },
    ]);
  } catch (error) {
    console.error('[MeiliIndexer] Failed to index research:', error);
  }
}

/**
 * Index note
 */
export async function indexNote(doc: {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  timestamp?: number;
}): Promise<void> {
  if (!meiliAvailable || !indexingEnabled) return;

  try {
    await indexDocuments('notes', [
      {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        tags: doc.tags || [],
        timestamp: doc.timestamp || Date.now(),
      },
    ]);
  } catch (error) {
    console.error('[MeiliIndexer] Failed to index note:', error);
  }
}

/**
 * Index a navigation context (e.g., page navigations) for quick recall
 */
export async function indexContext(context: {
  id: string;
  tabId: string;
  url: string;
  title?: string;
  timestamp?: number;
  mode?: string;
}): Promise<void> {
  if (!meiliAvailable || !indexingEnabled) return;

  try {
    await indexDocuments('contexts', [
      {
        id: context.id,
        tabId: context.tabId,
        url: context.url,
        title: context.title || deriveTitleFromUrl(context.url),
        timestamp: context.timestamp || Date.now(),
        mode: context.mode || 'Browse',
      },
    ]);
    // console.log(`[MeiliIndexer] Indexed context ${context.id}`);
  } catch (error) {
    console.error('[MeiliIndexer] Failed to index context:', error);
  }
}

export async function searchContexts(query: string, options?: { limit?: number; offset?: number }) {
  if (!meiliAvailable || !indexingEnabled)
    return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 };
  try {
    const res = await searchDocuments('contexts', query, {
      limit: options?.limit,
      offset: options?.offset,
    });
    return res;
  } catch (err) {
    console.error('[MeiliIndexer] Failed to search contexts:', err);
    return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 };
  }
}
/**
 * Enable/disable indexing
 */
export function setIndexingEnabled(enabled: boolean): void {
  indexingEnabled = enabled;
  console.log(`[MeiliIndexer] Indexing ${enabled ? 'enabled' : 'disabled'}`);
}

// Test helper to override meiliAvailable in tests
export function __setMeiliAvailableForTest(enabled: boolean): void {
  meiliAvailable = enabled;
}

// Test helpers to observe internal state from tests
export function __isMeiliAvailableForTest(): boolean {
  return meiliAvailable;
}

export function __isIndexingEnabledForTest(): boolean {
  return indexingEnabled;
}

// FIX: DO NOT auto-initialize when module loads - requires explicit user consent
// Indexing is opt-in only and should only be enabled when user explicitly enables it
// This prevents automatic indexing on page load
// To enable indexing, call enableIndexing() and then initMeiliIndexing()
// Example: enableIndexing(); initMeiliIndexing();
