// MeiliSearch Index Setup - Run once to create indexes
// This is called automatically when backend is ready
import { ensureIndex } from './meili';
const INDEXES = [
    { name: 'tabs', primaryKey: 'id' },
    { name: 'notes', primaryKey: 'id' },
    { name: 'research', primaryKey: 'id' },
    { name: 'charts', primaryKey: 'id' },
];
/**
 * Setup MeiliSearch indexes (creates if they don't exist)
 */
export async function setupMeiliIndexes() {
    try {
        console.log('[MeiliSetup] Creating indexes...');
        for (const index of INDEXES) {
            try {
                await ensureIndex(index.name, index.primaryKey);
                console.log(`[MeiliSetup] ✓ Index "${index.name}" ready`);
            }
            catch (error) {
                console.error(`[MeiliSetup] Failed to create index "${index.name}":`, error);
            }
        }
        console.log('[MeiliSetup] All indexes ready!');
    }
    catch (error) {
        console.error('[MeiliSetup] Setup failed:', error);
    }
}
// Auto-setup when module loads (if MeiliSearch is available)
if (typeof window !== 'undefined') {
    // Wait for backend to be ready
    window.addEventListener('backend-ready', () => {
        setTimeout(() => {
            setupMeiliIndexes().catch(console.error);
        }, 2000);
    });
}
