/**
 * Navigation Kernel - Complete navigation management system
 * Integrates history stack, back/forward cache, and preloading
 */

import { BrowserView } from 'electron';
import {
  initTabHistory,
  addHistoryEntry,
  goBack as historyGoBack,
  goForward as historyGoForward,
  getCurrentEntry,
  getHistoryState,
  removeTabHistory,
} from './navigation-history';
import {
  initTabCache,
  cachePage,
  getCachedPage,
  restoreCachedPage,
  clearTabCache,
} from './navigation-cache';

export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  currentUrl: string;
  currentTitle: string;
  historyLength: number;
  currentIndex: number;
}

export interface PrefetchTarget {
  url: string;
  reason: string;
  confidence: number;
}

/**
 * Initialize navigation for a tab
 */
export function initNavigation(tabId: string): void {
  initTabHistory(tabId);
  initTabCache(tabId);
}

/**
 * Handle navigation event (called when page navigates)
 */
export async function handleNavigation(
  tabId: string,
  view: BrowserView,
  url: string,
  title: string
): Promise<void> {
  // Add to history
  try {
    // Get scroll position before navigation
    const scrollPosition = await view.webContents
      .executeJavaScript(`({ x: window.scrollX || 0, y: window.scrollY || 0 })`)
      .catch(() => ({ x: 0, y: 0 }));

    addHistoryEntry(tabId, url, title, scrollPosition);
  } catch (error) {
    console.warn(`[NavigationKernel] Failed to add history entry for ${url}:`, error);
  }

  // Cache previous page (if exists)
  const currentEntry = getCurrentEntry(tabId);
  if (currentEntry && currentEntry.url !== url) {
    try {
      await cachePage(tabId, view, currentEntry.url, currentEntry.title);
    } catch (error) {
      console.warn(`[NavigationKernel] Failed to cache page ${currentEntry.url}:`, error);
    }
  }
}

/**
 * Navigate back in history
 */
export async function navigateBack(tabId: string, view: BrowserView): Promise<boolean> {
  const entry = historyGoBack(tabId);
  if (!entry) {
    return false;
  }

  try {
    // Check if we have a cached version
    const cached = getCachedPage(tabId, entry.url);
    if (cached) {
      // Navigate to URL
      view.webContents.loadURL(entry.url);
      // Restore cached state
      await restoreCachedPage(tabId, view, entry.url);
      return true;
    } else {
      // No cache, just navigate
      view.webContents.loadURL(entry.url);
      return true;
    }
  } catch (error) {
    console.error(`[NavigationKernel] Failed to navigate back:`, error);
    return false;
  }
}

/**
 * Navigate forward in history
 */
export async function navigateForward(tabId: string, view: BrowserView): Promise<boolean> {
  const entry = historyGoForward(tabId);
  if (!entry) {
    return false;
  }

  try {
    // Check if we have a cached version
    const cached = getCachedPage(tabId, entry.url);
    if (cached) {
      // Navigate to URL
      view.webContents.loadURL(entry.url);
      // Restore cached state
      await restoreCachedPage(tabId, view, entry.url);
      return true;
    } else {
      // No cache, just navigate
      view.webContents.loadURL(entry.url);
      return true;
    }
  } catch (error) {
    console.error(`[NavigationKernel] Failed to navigate forward:`, error);
    return false;
  }
}

/**
 * Get current navigation state
 */
export function getNavigationState(tabId: string): NavigationState | null {
  const state = getHistoryState(tabId);
  const current = getCurrentEntry(tabId);
  
  if (!current) {
    return null;
  }

  const history = require('./navigation-history').getHistory(tabId);
  
  return {
    canGoBack: state.canGoBack,
    canGoForward: state.canGoForward,
    currentUrl: current.url,
    currentTitle: current.title,
    historyLength: history.length,
    currentIndex: history.findIndex((e: any) => e.url === current.url),
  };
}

/**
 * Analyze page for prefetch targets
 */
export async function analyzePrefetchTargets(
  tabId: string,
  view: BrowserView
): Promise<PrefetchTarget[]> {
  try {
    const links = await view.webContents.executeJavaScript(`
      (() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .map(link => ({
            url: link.href,
            text: link.textContent?.trim() || '',
            isVisible: link.offsetParent !== null,
            isInViewport: (() => {
              const rect = link.getBoundingClientRect();
              return rect.top >= 0 && rect.top <= window.innerHeight;
            })(),
          }))
          .filter(link => {
            try {
              const url = new URL(link.url);
              return url.protocol === 'http:' || url.protocol === 'https:';
            } catch {
              return false;
            }
          })
          .slice(0, 20); // Limit to 20 links
      })()
    `);

    const targets: PrefetchTarget[] = links
      .map((link: any) => ({
        url: link.url,
        reason: link.isInViewport ? 'visible_in_viewport' : link.isVisible ? 'visible_on_page' : 'linked',
        confidence: link.isInViewport ? 0.8 : link.isVisible ? 0.5 : 0.3,
      }))
      .filter((target: PrefetchTarget) => target.confidence >= 0.3)
      .sort((a: PrefetchTarget, b: PrefetchTarget) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 targets

    return targets;
  } catch (error) {
    console.warn(`[NavigationKernel] Failed to analyze prefetch targets:`, error);
    return [];
  }
}

/**
 * Preload a URL (background fetch)
 */
export async function preloadUrl(url: string): Promise<void> {
  try {
    // Use a hidden BrowserView to preload
    const { BrowserView } = await import('electron');
    const preloadView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Load URL in background (don't show)
    preloadView.webContents.loadURL(url);

    // Clean up after a delay
    setTimeout(() => {
      try {
        if (preloadView && (preloadView as any).webContents && !(preloadView as any).webContents.isDestroyed()) {
          (preloadView as any).webContents.destroy();
        }
      } catch {
        // Ignore cleanup errors
      }
    }, 10000); // Keep for 10 seconds
  } catch (error) {
    console.warn(`[NavigationKernel] Failed to preload ${url}:`, error);
  }
}

/**
 * Preload next likely pages based on analysis
 */
export async function preloadNextPages(tabId: string, view: BrowserView): Promise<void> {
  const targets = await analyzePrefetchTargets(tabId, view);
  
  // Preload top 2 targets
  for (const target of targets.slice(0, 2)) {
    if (target.confidence >= 0.5) {
      await preloadUrl(target.url).catch(() => {
        // Ignore preload errors
      });
    }
  }
}

/**
 * Clean up navigation for a tab (when tab is closed)
 */
export function cleanupNavigation(tabId: string): void {
  removeTabHistory(tabId);
  clearTabCache(tabId);
}

/**
 * Get navigation history for a tab
 */
export function getNavigationHistory(tabId: string) {
  const { getHistory } = require('./navigation-history');
  return getHistory(tabId);
}

