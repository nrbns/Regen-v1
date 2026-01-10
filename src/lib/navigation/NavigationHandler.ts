/**
 * Navigation Handler - Backend-owned navigation system
 * Handles navigation confirmation events from backend
 */

import { useTabsStore } from '../../state/tabsStore';

/**
 * Initialize navigation event listeners
 * This should be called once when the app starts
 */
export function initNavigationHandler(): void {
  if (typeof window === 'undefined') return;

  // Listen for navigation confirmation from backend
  const handleNavigationConfirmed = (event: CustomEvent<{
    tabId?: string;
    url: string;
    title?: string;
  }>) => {
    const { tabId, url, title } = event.detail;
    const tabsState = useTabsStore.getState();
    
    // Determine which tab to update
    const targetTabId = tabId || tabsState.activeTabId;
    
    if (targetTabId) {
      // Backend confirmed navigation - update UI
      tabsState.onNavigationConfirmed(targetTabId, url, title);
      
      // Emit event for components that need to react to navigation
      window.dispatchEvent(new CustomEvent('regen:navigation:completed', {
        detail: { tabId: targetTabId, url, title },
      }));
    } else {
      // No active tab, create one
      tabsState.addTab(url);
    }
  };

  window.addEventListener('regen:navigation:confirmed', handleNavigationConfirmed as EventListener);

  // Also listen for iframe/webview navigation events (when backend confirms)
  window.addEventListener('regen:webview:navigated', handleNavigationConfirmed as EventListener);
}

/**
 * Request navigation through backend
 * This is the only way navigation should be initiated from UI
 */
export function requestNavigation(url: string, tabId?: string): void {
  // Emit navigation request event
  // CommandController or backend handler will pick this up
  window.dispatchEvent(new CustomEvent('regen:navigate', {
    detail: {
      url,
      tabId,
      timestamp: Date.now(),
    },
  }));
}

/**
 * Confirm navigation (called by backend after navigation completes)
 * This should NOT be called directly from UI - only from backend/IPC handlers
 */
export function confirmNavigation(tabId: string, url: string, title?: string): void {
  // Emit confirmation event that tabsStore will listen to
  window.dispatchEvent(new CustomEvent('regen:navigation:confirmed', {
    detail: { tabId, url, title },
  }));
}
