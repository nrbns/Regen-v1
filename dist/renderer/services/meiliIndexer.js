// MeiliSearch Auto-Indexing Service
// Automatically indexes tabs, research, notes as they're created/updated
import { indexDocuments, ensureIndex, checkMeiliSearch } from '../lib/meili';
let meiliAvailable = false;
let indexingEnabled = true;
/**
 * Initialize MeiliSearch indexing
 */
export async function initMeiliIndexing() {
    try {
        meiliAvailable = await checkMeiliSearch();
        if (meiliAvailable) {
            // Ensure indexes exist - suppress errors if MeiliSearch becomes unavailable
            try {
                await ensureIndex('tabs', 'id');
                await ensureIndex('research', 'id');
                await ensureIndex('notes', 'id');
            }
            catch {
                // MeiliSearch not available or unauthorized - silently disable
                meiliAvailable = false;
                indexingEnabled = false;
                return;
            }
        }
        else {
            // MeiliSearch not available - silently disable indexing
            meiliAvailable = false;
            indexingEnabled = false;
        }
    }
    catch {
        // Suppress MeiliSearch errors - it's optional and may not be running
        meiliAvailable = false;
        indexingEnabled = false;
    }
}
/**
 * Index a single tab
 */
export async function indexTab(tab) {
    if (!meiliAvailable || !indexingEnabled)
        return;
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
    }
    catch (error) {
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
export async function indexTabs(tabs) {
    if (!meiliAvailable || !indexingEnabled || tabs.length === 0)
        return;
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
    }
    catch (error) {
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
export async function indexResearch(doc) {
    if (!meiliAvailable || !indexingEnabled)
        return;
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
    }
    catch (error) {
        console.error('[MeiliIndexer] Failed to index research:', error);
    }
}
/**
 * Index note
 */
export async function indexNote(doc) {
    if (!meiliAvailable || !indexingEnabled)
        return;
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
    }
    catch (error) {
        console.error('[MeiliIndexer] Failed to index note:', error);
    }
}
/**
 * Enable/disable indexing
 */
export function setIndexingEnabled(enabled) {
    indexingEnabled = enabled;
    console.log(`[MeiliIndexer] Indexing ${enabled ? 'enabled' : 'disabled'}`);
}
// Auto-initialize when module loads - suppress all errors
if (typeof window !== 'undefined') {
    // Wait a bit for MeiliSearch to start
    setTimeout(() => {
        initMeiliIndexing().catch(() => {
            // Suppress all MeiliSearch errors - it's optional
        });
    }, 3000);
}
