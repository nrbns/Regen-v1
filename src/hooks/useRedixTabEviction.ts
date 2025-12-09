/**
 * Hook for Redix Tab Eviction
 * Automatically evicts inactive tabs in Redix mode
 */

import { useEffect, useRef } from 'react';
import { useTabsStore } from '../state/tabsStore';
import { getRedixConfig, isRedixMode } from '../lib/redix-mode';
import { evictInactiveTabs, cleanupOldSnapshots } from '../utils/tabEviction';

/**
 * Hook to enable automatic tab eviction in Redix mode
 */
export function useRedixTabEviction(enabled: boolean = true) {
  const { tabs, activeId } = useTabsStore();
  const evictionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !isRedixMode()) {
      // Clean up interval if Redix mode is disabled
      if (evictionIntervalRef.current) {
        clearInterval(evictionIntervalRef.current);
        evictionIntervalRef.current = null;
      }
      return;
    }

    const config = getRedixConfig();
    if (!config.enableTabEviction) {
      return;
    }

    // Cleanup old snapshots on mount
    cleanupOldSnapshots();

    // Evict tabs periodically (every 30 seconds)
    evictionIntervalRef.current = setInterval(async () => {
      try {
        const evicted = await evictInactiveTabs(tabs, activeId, config.maxTabs);
        if (evicted.length > 0) {
          console.log(`[RedixEviction] Evicted ${evicted.length} inactive tabs`);
        }
      } catch (error) {
        console.error('[RedixEviction] Error during eviction:', error);
      }
    }, 30000); // Check every 30 seconds

    // Also evict immediately if over limit
    if (tabs.length > config.maxTabs) {
      evictInactiveTabs(tabs, activeId, config.maxTabs).catch(console.error);
    }

    return () => {
      if (evictionIntervalRef.current) {
        clearInterval(evictionIntervalRef.current);
        evictionIntervalRef.current = null;
      }
    };
  }, [enabled, tabs, activeId]);
}



