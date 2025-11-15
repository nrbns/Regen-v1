/**
 * Prefetch Engine
 * Predicts and prefetches next pages for faster navigation
 */

import { BrowserView } from 'electron';
import { getTabs, findTabById } from './tabs';
import { BrowserWindow } from 'electron';

export interface PrefetchTarget {
  url: string;
  reason: string;
  confidence: number; // 0-1
  priority: 'high' | 'medium' | 'low';
}

interface PrefetchQueue {
  targets: PrefetchTarget[];
  maxConcurrent: number;
  activePrefetches: Set<string>; // URLs currently being prefetched
}

const prefetchQueues = new Map<string, PrefetchQueue>(); // tabId -> queue
const prefetchCache = new Map<string, { timestamp: number; data: any }>(); // URL -> cached data

const DEFAULT_MAX_CONCURRENT = 5; // Increased for better prefetching
const PREFETCH_CACHE_MAX_AGE = 15 * 60 * 1000; // 15 minutes (increased cache time)
const PREFETCH_DELAY_MS = 2000; // Wait 2s after page load before prefetching

/**
 * Initialize prefetch queue for a tab
 */
export function initPrefetchQueue(tabId: string, maxConcurrent: number = DEFAULT_MAX_CONCURRENT): void {
  if (!prefetchQueues.has(tabId)) {
    prefetchQueues.set(tabId, {
      targets: [],
      maxConcurrent,
      activePrefetches: new Set(),
    });
  }
}

/**
 * Analyze page and predict next navigation targets
 */
export async function analyzePageForPrefetch(tabId: string, view: BrowserView, url: string): Promise<PrefetchTarget[]> {
  const targets: PrefetchTarget[] = [];

  try {
    // Extract links from page
    const links = await view.webContents.executeJavaScript(`
      (() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .map(link => ({
            href: link.getAttribute('href'),
            text: link.innerText?.trim() || '',
            rel: link.getAttribute('rel') || '',
            className: link.className || '',
          }))
          .filter(link => {
            const href = link.href;
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
            try {
              const urlObj = new URL(href, window.location.href);
              return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
            } catch {
              return false;
            }
          })
          .slice(0, 20); // Limit to top 20 links
      })()
    `).catch(() => []);

    // Score links for prefetch priority
    for (const link of links) {
      try {
        const absoluteUrl = new URL(link.href, url).href;
        
        // Skip if already in cache
        if (prefetchCache.has(absoluteUrl)) {
          continue;
        }

        let confidence = 0.3; // Base confidence
        let priority: 'high' | 'medium' | 'low' = 'low';

        // Increase confidence based on link characteristics
        if (link.text.toLowerCase().includes('next') || link.text.toLowerCase().includes('continue')) {
          confidence += 0.3;
          priority = 'high';
        }
        if (link.rel.includes('next')) {
          confidence += 0.2;
          priority = 'high';
        }
        if (link.className.includes('next') || link.className.includes('continue') || link.className.includes('pagination')) {
          confidence += 0.2;
          priority = 'medium';
        }
        if (link.text.length > 0 && link.text.length < 50) {
          confidence += 0.1; // Short, descriptive links are more likely to be clicked
        }

        // Same domain links are more likely
        try {
          const currentDomain = new URL(url).hostname;
          const linkDomain = new URL(absoluteUrl).hostname;
          if (currentDomain === linkDomain) {
            confidence += 0.15; // Increased weight for same-domain
          }
        } catch {}

        // Boost confidence for links in viewport
        // (In production, check if link is visible)
        if (link.className.includes('hero') || link.className.includes('cta') || link.className.includes('button')) {
          confidence += 0.2;
        }

        confidence = Math.min(1, confidence);

        if (confidence > 0.4) { // Only prefetch if confidence is reasonable
          targets.push({
            url: absoluteUrl,
            reason: `Link: ${link.text || link.href}`,
            confidence,
            priority,
          });
        }
      } catch (error) {
        // Skip invalid URLs
        continue;
      }
    }

    // Sort by confidence (highest first)
    targets.sort((a, b) => b.confidence - a.confidence);

    // Limit to top 5 targets
    return targets.slice(0, 5);
  } catch (error) {
    console.warn(`[PrefetchEngine] Failed to analyze page for prefetch:`, error);
    return [];
  }
}

/**
 * Add prefetch targets to queue
 */
export function queuePrefetchTargets(tabId: string, targets: PrefetchTarget[]): void {
  let queue = prefetchQueues.get(tabId);
  if (!queue) {
    initPrefetchQueue(tabId);
    queue = prefetchQueues.get(tabId)!;
  }

  // Add targets that aren't already queued or active
  for (const target of targets) {
    const isQueued = queue.targets.some(t => t.url === target.url);
    const isActive = queue.activePrefetches.has(target.url);
    
    if (!isQueued && !isActive && !prefetchCache.has(target.url)) {
      queue.targets.push(target);
    }
  }

  // Sort by priority and confidence
  queue.targets.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.confidence - a.confidence;
  });

  // Process queue
  processPrefetchQueue(tabId);
}

/**
 * Process prefetch queue for a tab
 */
async function processPrefetchQueue(tabId: string): Promise<void> {
  const queue = prefetchQueues.get(tabId);
  if (!queue) {
    return;
  }

  // Start prefetching up to maxConcurrent
  while (queue.activePrefetches.size < queue.maxConcurrent && queue.targets.length > 0) {
    const target = queue.targets.shift()!;
    queue.activePrefetches.add(target.url);

    // Prefetch in background
    prefetchUrl(target.url, target).then(() => {
      queue.activePrefetches.delete(target.url);
      // Continue processing queue
      processPrefetchQueue(tabId);
    }).catch(() => {
      queue.activePrefetches.delete(target.url);
      processPrefetchQueue(tabId);
    });
  }
}

/**
 * Prefetch a URL with optimized strategy
 */
async function prefetchUrl(url: string, target: PrefetchTarget): Promise<void> {
  try {
    // Check cache first
    const cached = prefetchCache.get(url);
    if (cached && Date.now() - cached.timestamp < PREFETCH_CACHE_MAX_AGE) {
      return; // Already cached and fresh
    }

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      // Prefetch using fetch (lightweight, doesn't execute JS)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'OmniBrowser/1.0',
          'Accept': 'text/html,application/xhtml+xml',
        },
        cache: 'force-cache',
        signal: controller.signal,
      });

      if (response.ok) {
        const html = await response.text();
        
        // Cache the prefetched content
        prefetchCache.set(url, {
          timestamp: Date.now(),
          data: {
            html,
            headers: Object.fromEntries(response.headers.entries()),
          },
        });

        // Limit cache size (remove oldest entries)
        if (prefetchCache.size > 50) {
          const entries = Array.from(prefetchCache.entries());
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
          const toRemove = entries.slice(0, entries.length - 50);
          toRemove.forEach(([url]) => prefetchCache.delete(url));
        }
      }
    } catch (error) {
      // Silent fail - prefetch is best-effort
      console.debug(`[PrefetchEngine] Failed to prefetch ${url}:`, error);
    }
}

/**
 * Get prefetched content for a URL
 */
export function getPrefetchedContent(url: string): { html: string; headers: Record<string, string> } | null {
  const cached = prefetchCache.get(url);
  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.timestamp;
  if (age > PREFETCH_CACHE_MAX_AGE) {
    prefetchCache.delete(url);
    return null;
  }

  return cached.data;
}

/**
 * Clear prefetch queue for a tab
 */
export function clearPrefetchQueue(tabId: string): void {
  prefetchQueues.delete(tabId);
}

/**
 * Enable/disable prefetching for a tab
 */
export function setPrefetchEnabled(tabId: string, enabled: boolean): void {
  if (!enabled) {
    clearPrefetchQueue(tabId);
  } else {
    initPrefetchQueue(tabId);
  }
}

