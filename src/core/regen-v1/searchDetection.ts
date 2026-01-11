/**
 * Search Detection - Regen-v1
 * Detects repeated searches and emits events
 */

import { regenEventBus } from "../events/eventBus";
import { eventBus } from "../../lib/events/EventBus";

const searchHistory: string[] = [];
const MAX_HISTORY = 10;
const REPEAT_WINDOW_MS = 60000; // 1 minute

export function trackSearch(query: string): void {
  if (!query.trim()) return;

  const normalized = query.toLowerCase().trim();
  
  // Clean old searches
  while (searchHistory.length > MAX_HISTORY) {
    searchHistory.shift();
  }

  // Check for repeats in last 3 searches
  const recentSearches = searchHistory.slice(-3);
  const isRepeat = recentSearches.some(s => s === normalized);

  if (isRepeat) {
    regenEventBus.emit({ 
      type: "COMMAND", 
      payload: `Repeated search detected: "${query}". Refine query?` 
    });
  }

  searchHistory.push(normalized);
}

// Hook into existing search
export function initSearchDetection(): () => void {
  // Listen to EventBus SEARCH_SUBMIT events (primary method)
  const unsubscribeEventBus = eventBus.on('SEARCH_SUBMIT', (event) => {
    const query = event.data?.query;
    if (query && typeof query === 'string') {
      trackSearch(query);
    }
  });

  // Also listen to custom events (fallback)
  const handleSearch = (e: CustomEvent) => {
    const query = e.detail?.query || (e as any).query;
    if (query && typeof query === 'string') {
      trackSearch(query);
    }
  };

  window.addEventListener('regen:search', handleSearch as EventListener);
  window.addEventListener('research:query', handleSearch as EventListener);

  return () => {
    unsubscribeEventBus();
    window.removeEventListener('regen:search', handleSearch as EventListener);
    window.removeEventListener('research:query', handleSearch as EventListener);
  };
}