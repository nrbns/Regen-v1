/**
 * Task Resume System - Tier 2
 * Resume unsaved tasks after crash/reload
 */

import { loadSnapshot } from './snapshot';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { ipc } from '../../lib/ipc-typed';
import { log } from '../../utils/logger';
import { toast } from '../../utils/toast';

export interface ResumeResult {
  success: boolean;
  restoredTabs: number;
  restoredMode: string | null;
  error?: string;
}

/**
 * Resume session from snapshot
 */
export async function resumeSession(): Promise<ResumeResult> {
  try {
    const snapshot = loadSnapshot();
    if (!snapshot) {
      return {
        success: false,
        restoredTabs: 0,
        restoredMode: null,
        error: 'No snapshot found',
      };
    }

    log.info('Resuming session from snapshot', {
      tabCount: snapshot.tabs.length,
      mode: snapshot.mode,
      age: Date.now() - snapshot.timestamp,
    });

    // Restore mode
    if (snapshot.mode) {
      await useAppStore.getState().setMode(snapshot.mode as any);
    }

    // Restore tabs
    let restoredCount = 0;
    for (const tab of snapshot.tabs) {
      try {
        const url = tab.url || 'about:blank';
        const newTab = await ipc.tabs.create(url);
        const tabId =
          typeof newTab === 'object' && newTab && 'id' in newTab
            ? newTab.id
            : typeof newTab === 'string'
              ? newTab
              : null;

        // Update tab with snapshot data
        if (tabId && typeof tabId === 'string') {
          useTabsStore.getState().updateTab(tabId, {
            title: tab.title,
            appMode: tab.appMode,
            url: tab.url,
          });

          restoredCount++;
        }
      } catch (error) {
        log.warn('Failed to restore tab', { tabId: tab.id, error });
      }
    }

    // Set active tab
    if (snapshot.activeTabId) {
      const restoredTab = useTabsStore.getState().tabs.find(t => t.id === snapshot.activeTabId);
      if (restoredTab) {
        useTabsStore.getState().setActive(snapshot.activeTabId);
        await ipc.tabs.activate({ id: snapshot.activeTabId });
      }
    }

    toast.success(`Restored ${restoredCount} tab${restoredCount === 1 ? '' : 's'} from snapshot`);

    return {
      success: true,
      restoredTabs: restoredCount,
      restoredMode: snapshot.mode,
    };
  } catch (error) {
    log.error('Failed to resume session', error);
    return {
      success: false,
      restoredTabs: 0,
      restoredMode: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
