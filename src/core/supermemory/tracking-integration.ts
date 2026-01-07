/**
 * SuperMemory Tracking Integration
 * Auto-tracking hooks and utilities for browser components
 */

import React from 'react';
import { trackVisit, trackSearch, trackModeSwitch } from './tracker';
// import { trackBookmark, trackHighlight, trackScreenshot, trackNote } from './tracker'; // Unused for now
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';

/**
 * Auto-track page visits when tabs navigate
 * Call this in tab navigation handlers
 */
export async function autoTrackVisit(
  url: string,
  title?: string,
  tabId?: string
): Promise<void> {
  try {
    if (!url || url === 'about:blank' || url.startsWith('chrome://') || url.startsWith('edge://')) {
      return; // Skip system pages
    }

    await trackVisit(url, title, {
      tabId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('[SuperMemory] Failed to track visit:', error);
  }
}

/**
 * Auto-track search queries
 * Call this when user performs a search
 */
export async function autoTrackSearch(
  query: string,
  searchEngine?: string,
  clickedResult?: { url: string; title: string; position: number }
): Promise<void> {
  try {
    if (!query || query.trim().length === 0) {
      return;
    }

    await trackSearch(query, {
      searchEngine,
      clickedResult,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('[SuperMemory] Failed to track search:', error);
  }
}

/**
 * Auto-track mode switches
 * Call this when user changes browser mode
 */
export async function autoTrackModeSwitch(
  fromMode: string,
  toMode: string,
  _reason?: string
): Promise<void> {
  try {
    await trackModeSwitch(toMode);
  } catch (error) {
    console.warn('[SuperMemory] Failed to track mode switch:', error);
  }
}

/**
 * React hook to auto-track visits for active tab
 */
export function useAutoTrackVisits() {
  const activeTab = useTabsStore((state) => {
    const tabs = state.tabs;
    const activeId = state.activeId;
    return tabs.find((t) => t.id === activeId);
  });

  // Track visit when active tab changes
  React.useEffect(() => {
    if (activeTab?.url) {
      autoTrackVisit(activeTab.url, activeTab.title, activeTab.id).catch(console.error);
    }
  }, [activeTab?.url, activeTab?.title, activeTab?.id]);
}

/**
 * React hook to auto-track mode switches
 */
export function useAutoTrackModeSwitches() {
  const mode = useAppStore((state) => state.mode);
  const prevModeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (prevModeRef.current && prevModeRef.current !== mode) {
      autoTrackModeSwitch(prevModeRef.current, mode).catch(console.error);
    }
    prevModeRef.current = mode;
  }, [mode]);
}

