// MeiliSearch Auto-Indexing Service
// Automatically indexes tabs, research, notes as they're created/updated

import { indexDocuments, ensureIndex, checkMeiliSearch } from '../lib/meili';
import type { Tab } from '../state/tabsStore';

let meiliAvailable = false;
let indexingEnabled = true;

/**
 * Initialize MeiliSearch indexing
 */
export async function initMeiliIndexing(): Promise<void> {
  try {
    meiliAvailable = await checkMeiliSearch();
    if (meiliAvailable) {
      console.log('[MeiliIndexer] MeiliSearch is available, indexing enabled');
      // Ensure indexes exist
      await ensureIndex('tabs', 'id');
      await ensureIndex('research', 'id');
      await ensureIndex('notes', 'id');
    } else {
      console.warn('[MeiliIndexer] MeiliSearch not available, indexing disabled');
    }
  } catch (error) {
    console.error('[MeiliIndexer] Failed to initialize:', error);
    meiliAvailable = false;
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
    console.error('[MeiliIndexer] Failed to index tab:', error);
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
    console.error('[MeiliIndexer] Failed to index tabs:', error);
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
 * Enable/disable indexing
 */
export function setIndexingEnabled(enabled: boolean): void {
  indexingEnabled = enabled;
  console.log(`[MeiliIndexer] Indexing ${enabled ? 'enabled' : 'disabled'}`);
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Wait a bit for MeiliSearch to start
  setTimeout(() => {
    initMeiliIndexing().catch(console.error);
  }, 3000);
}


