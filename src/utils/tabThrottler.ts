/**
 * Tab Throttler - Throttle background tabs to reduce CPU/battery drain
 */

import { useTabsStore } from '../state/tabsStore';

/**
 * Throttle a function based on tab visibility
 * Only executes if tab is active or visible
 */
export function throttleForActiveTab<T extends (...args: any[]) => any>(
  func: T,
  tabId: string | null
): (...args: Parameters<T>) => void {
  return function throttled(...args: Parameters<T>) {
    const tabs = useTabsStore.getState().tabs;
    const activeTab = tabs.find(t => t.id === tabId);
    const isActive = activeTab?.active === true;
    const isVisible = !document.hidden;

    // Only execute if tab is active and visible
    if (isActive && isVisible) {
      func(...args);
    }
  };
}

/**
 * Check if a tab should be throttled (background tab)
 */
export function shouldThrottleTab(tabId: string | null): boolean {
  const tabs = useTabsStore.getState().tabs;
  const tab = tabs.find(t => t.id === tabId);
  const isActive = tab?.active === true;
  const isVisible = !document.hidden;

  // Throttle if tab is not active or page is hidden
  return !isActive || !isVisible;
}
