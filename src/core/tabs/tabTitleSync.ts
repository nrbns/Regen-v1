/**
 * Tab Title Sync - Real-time title updates from webview
 * Phase 1, Day 1: Fix tab title updates (real-time sync)
 */

import { useTabsStore } from '../../state/tabsStore';
import { ipcEvents } from '../../lib/ipc-events';

/**
 * Setup real-time title sync for a tab
 * Listens to webview events and updates tab title immediately
 */
export function setupTabTitleSync(tabId: string, webview: any) {
  if (!webview) return () => {}; // Return no-op cleanup

  const updateTitle = (title: string) => {
    const currentTab = useTabsStore.getState().tabs.find(t => t.id === tabId);
    if (currentTab && currentTab.title !== title) {
      useTabsStore.getState().updateTab(tabId, { title });
    }
  };

  const updateUrl = (url: string) => {
    const currentTab = useTabsStore.getState().tabs.find(t => t.id === tabId);
    if (currentTab && currentTab.url !== url) {
      useTabsStore.getState().updateTab(tabId, { url });
    }
  };

  // Listen for page title updates
  const handleTitleUpdated = (event: { title: string; tabId?: string }) => {
    if (event.tabId === tabId || !event.tabId) {
      updateTitle(event.title);
    }
  };

  // Listen for navigation events
  const handleDidNavigate = (event: { url: string; tabId?: string }) => {
    if (event.tabId === tabId || !event.tabId) {
      updateUrl(event.url);
    }
  };

  // Subscribe to IPC events
  const unsubscribeTitle = ipcEvents.on('page-title-updated', handleTitleUpdated);
  const unsubscribeNavigate = ipcEvents.on('did-navigate', handleDidNavigate);

  // If webview has direct event listeners (Electron/Tauri)
  if (webview.addEventListener) {
    webview.addEventListener('page-title-updated', (e: any) => {
      updateTitle(e.title || webview.getTitle?.() || '');
    });

    webview.addEventListener('did-navigate', (e: any) => {
      updateUrl(e.url || webview.getURL?.() || '');
    });
  }

  // Cleanup function
  return () => {
    unsubscribeTitle();
    unsubscribeNavigate();
    if (webview.removeEventListener) {
      webview.removeEventListener('page-title-updated', () => {});
      webview.removeEventListener('did-navigate', () => {});
    }
  };
}

/**
 * Enhanced title sync with polling fallback for cross-origin frames
 */
export function setupEnhancedTitleSync(
  tabId: string,
  iframe: HTMLIFrameElement | null
): () => void {
  if (!iframe) return () => {};

  let pollInterval: NodeJS.Timeout | null = null;
  let lastTitle = '';
  let lastUrl = '';

  const checkTitle = () => {
    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;

      if (win && doc) {
        const newTitle = doc.title || '';
        const newUrl = win.location.href || '';

        if (newTitle && newTitle !== lastTitle) {
          lastTitle = newTitle;
          useTabsStore.getState().updateTab(tabId, { title: newTitle });
        }

        if (newUrl && newUrl !== lastUrl) {
          lastUrl = newUrl;
          useTabsStore.getState().updateTab(tabId, { url: newUrl });
        }
      }
    } catch {
      // Cross-origin - can't access, stop polling
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }
  };

  // Poll every 500ms for title changes (fallback for MutationObserver)
  pollInterval = setInterval(checkTitle, 500);

  // Also check immediately
  checkTitle();

  return () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}
