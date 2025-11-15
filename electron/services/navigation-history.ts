/**
 * Navigation History Stack
 * Maintains back/forward history for each tab
 */

// BrowserView not used in this module

export interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
  scrollPosition?: { x: number; y: number };
}

interface TabHistory {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
}

const tabHistories = new Map<string, TabHistory>();

const DEFAULT_MAX_ENTRIES = 50;

/**
 * Initialize history for a tab
 */
export function initTabHistory(tabId: string, maxEntries: number = DEFAULT_MAX_ENTRIES): void {
  if (!tabHistories.has(tabId)) {
    tabHistories.set(tabId, {
      entries: [],
      currentIndex: -1,
      maxEntries,
    });
  }
}

/**
 * Add entry to history
 */
export function addHistoryEntry(tabId: string, url: string, title: string, scrollPosition?: { x: number; y: number }): void {
  let history = tabHistories.get(tabId);
  if (!history) {
    initTabHistory(tabId);
    history = tabHistories.get(tabId)!;
  }

  // Remove any entries after current index (when navigating forward from history)
  if (history.currentIndex < history.entries.length - 1) {
    history.entries = history.entries.slice(0, history.currentIndex + 1);
  }

  // Add new entry
  const entry: HistoryEntry = {
    url,
    title,
    timestamp: Date.now(),
    scrollPosition,
  };

  history.entries.push(entry);
  history.currentIndex = history.entries.length - 1;

  // Limit history size
  if (history.entries.length > history.maxEntries) {
    history.entries.shift();
    history.currentIndex = history.entries.length - 1;
  }
}

/**
 * Navigate back in history
 */
export function goBack(tabId: string): HistoryEntry | null {
  const history = tabHistories.get(tabId);
  if (!history || history.currentIndex <= 0) {
    return null;
  }

  history.currentIndex--;
  return history.entries[history.currentIndex] || null;
}

/**
 * Navigate forward in history
 */
export function goForward(tabId: string): HistoryEntry | null {
  const history = tabHistories.get(tabId);
  if (!history || history.currentIndex >= history.entries.length - 1) {
    return null;
  }

  history.currentIndex++;
  return history.entries[history.currentIndex] || null;
}

/**
 * Get current history entry
 */
export function getCurrentEntry(tabId: string): HistoryEntry | null {
  const history = tabHistories.get(tabId);
  if (!history || history.currentIndex < 0 || history.currentIndex >= history.entries.length) {
    return null;
  }

  return history.entries[history.currentIndex] || null;
}

/**
 * Get all history entries
 */
export function getHistory(tabId: string): HistoryEntry[] {
  const history = tabHistories.get(tabId);
  return history?.entries || [];
}

/**
 * Get history state (can go back/forward)
 */
export function getHistoryState(tabId: string): { canGoBack: boolean; canGoForward: boolean } {
  const history = tabHistories.get(tabId);
  if (!history) {
    return { canGoBack: false, canGoForward: false };
  }

  return {
    canGoBack: history.currentIndex > 0,
    canGoForward: history.currentIndex < history.entries.length - 1,
  };
}

/**
 * Clear history for a tab
 */
export function clearHistory(tabId: string): void {
  tabHistories.delete(tabId);
}

/**
 * Search history
 */
export function searchHistory(tabId: string, query: string): HistoryEntry[] {
  const history = tabHistories.get(tabId);
  if (!history) {
    return [];
  }

  const queryLower = query.toLowerCase();
  return history.entries.filter(
    (entry) =>
      entry.url.toLowerCase().includes(queryLower) ||
      entry.title.toLowerCase().includes(queryLower)
  );
}

/**
 * Remove tab history (when tab is closed)
 */
export function removeTabHistory(tabId: string): void {
  tabHistories.delete(tabId);
}

