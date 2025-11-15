/**
 * Back/Forward Cache
 * Caches page state for instant back/forward navigation
 */

import { BrowserView } from 'electron';

export interface CachedPage {
  url: string;
  title: string;
  timestamp: number;
  scrollPosition: { x: number; y: number };
  formData?: Record<string, string>; // Form field values
  snapshot?: string; // Base64 encoded screenshot or HTML snapshot
}

interface TabCache {
  entries: Map<string, CachedPage>; // URL -> CachedPage
  maxSize: number;
  maxAge: number; // milliseconds
}

const tabCaches = new Map<string, TabCache>();

const DEFAULT_MAX_SIZE = 10; // Max cached pages per tab
const DEFAULT_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Initialize cache for a tab
 */
export function initTabCache(tabId: string, maxSize: number = DEFAULT_MAX_SIZE, maxAge: number = DEFAULT_MAX_AGE): void {
  if (!tabCaches.has(tabId)) {
    tabCaches.set(tabId, {
      entries: new Map(),
      maxSize,
      maxAge,
    });
  }
}

/**
 * Cache a page
 */
export async function cachePage(tabId: string, view: BrowserView, url: string, title: string): Promise<void> {
  let cache = tabCaches.get(tabId);
  if (!cache) {
    initTabCache(tabId);
    cache = tabCaches.get(tabId)!;
  }

  try {
    // Get scroll position
    const scrollPosition = await view.webContents.executeJavaScript(`
      ({ x: window.scrollX || 0, y: window.scrollY || 0 })
    `).catch(() => ({ x: 0, y: 0 }));

    // Get form data (if any)
    const formData = await view.webContents.executeJavaScript(`
      (() => {
        const forms = document.querySelectorAll('form');
        const data = {};
        forms.forEach((form, idx) => {
          const formData = new FormData(form);
          const entries = {};
          for (const [key, value] of formData.entries()) {
            entries[key] = value;
          }
          if (Object.keys(entries).length > 0) {
            data[\`form_\${idx}\`] = entries;
          }
        });
        return Object.keys(data).length > 0 ? data : undefined;
      })()
    `).catch(() => undefined);

    // Create cached entry
    const cachedPage: CachedPage = {
      url,
      title,
      timestamp: Date.now(),
      scrollPosition,
      formData,
    };

    // Remove oldest entries if cache is full
    if (cache.entries.size >= cache.maxSize) {
      const entriesArray = Array.from(cache.entries.entries());
      entriesArray.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entriesArray.slice(0, entriesArray.length - cache.maxSize + 1);
      toRemove.forEach(([url]) => cache.entries.delete(url));
    }

    // Add to cache
    cache.entries.set(url, cachedPage);
  } catch (error) {
    console.warn(`[NavigationCache] Failed to cache page ${url}:`, error);
  }
}

/**
 * Get cached page
 */
export function getCachedPage(tabId: string, url: string): CachedPage | null {
  const cache = tabCaches.get(tabId);
  if (!cache) {
    return null;
  }

  const cached = cache.entries.get(url);
  if (!cached) {
    return null;
  }

  // Check if cache is expired
  const age = Date.now() - cached.timestamp;
  if (age > cache.maxAge) {
    cache.entries.delete(url);
    return null;
  }

  return cached;
}

/**
 * Restore cached page state
 */
export async function restoreCachedPage(tabId: string, view: BrowserView, url: string): Promise<boolean> {
  const cached = getCachedPage(tabId, url);
  if (!cached) {
    return false;
  }

  try {
    // Wait for page to load
    await new Promise<void>((resolve) => {
      const checkLoaded = () => {
        if (view.webContents.getURL() === url && !view.webContents.isLoading()) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });

    // Restore scroll position
    await view.webContents.executeJavaScript(`
      window.scrollTo(${cached.scrollPosition.x}, ${cached.scrollPosition.y});
    `).catch(() => {});

    // Restore form data
    if (cached.formData) {
      await view.webContents.executeJavaScript(`
        (() => {
          const forms = document.querySelectorAll('form');
          const formData = ${JSON.stringify(cached.formData)};
          let formIdx = 0;
          forms.forEach((form) => {
            const formKey = \`form_\${formIdx}\`;
            if (formData[formKey]) {
              Object.entries(formData[formKey]).forEach(([name, value]) => {
                const input = form.querySelector(\`[name="\${name}"]\`);
                if (input && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT')) {
                  (input as HTMLInputElement).value = value;
                }
              });
            }
            formIdx++;
          });
        })()
      `).catch(() => {});
    }

    return true;
  } catch (error) {
    console.warn(`[NavigationCache] Failed to restore cached page ${url}:`, error);
    return false;
  }
}

/**
 * Clear cache for a tab
 */
export function clearTabCache(tabId: string): void {
  tabCaches.delete(tabId);
}

/**
 * Clear expired entries from all caches
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const cache of tabCaches.values()) {
    for (const [url, entry] of cache.entries.entries()) {
      const age = now - entry.timestamp;
      if (age > cache.maxAge) {
        cache.entries.delete(url);
      }
    }
  }
}

// Periodic cleanup (every 5 minutes)
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

