/**
 * Live Tab Scraper - v0.4 Research Mode Fix
 * Scrapes DOM content from active browser tabs in realtime
 * Uses iframe postMessage or Tauri IPC to execute JS in webview
 */

import { useTabsStore } from '../state/tabsStore';

// Get tabs store state directly (not as hook)
function getTabsState() {
  return useTabsStore.getState();
}

export interface LiveScrapeResult {
  url: string;
  title: string;
  content: string;
  text: string; // Plain text extracted
  html?: string; // Full HTML if available
  images?: string[]; // Image URLs
  links?: Array<{ text: string; url: string }>;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Scrape content from active tab using iframe postMessage
 */
export async function scrapeActiveTab(): Promise<LiveScrapeResult | null> {
  const tabsState = getTabsState();
  const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);

  if (!activeTab?.url || !activeTab.url.startsWith('http')) {
    console.debug('[LiveTabScraper] No active HTTP tab to scrape');
    return null;
  }

  try {
    // Find iframe for active tab
    const iframe = document.querySelector(
      `iframe[data-tab-id="${activeTab.id}"]`
    ) as HTMLIFrameElement;

    if (!iframe?.contentWindow) {
      console.debug('[LiveTabScraper] No iframe found, trying Tauri IPC fallback');
      // Fallback: Try to scrape via Tauri IPC if available
      return await scrapeViaTauri(activeTab.url);
    }

    // Execute scraping script in iframe
    const scrapeScript = `
      (function() {
        try {
          const title = document.title || '';
          const text = document.body?.innerText || document.body?.textContent || '';
          const html = document.documentElement.outerHTML || '';
          
          // Extract images
          const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src || img.getAttribute('data-src'))
            .filter(Boolean);
          
          // Extract links
          const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({
              text: a.textContent?.trim() || '',
              url: a.href || ''
            }))
            .filter(l => l.url && l.url.startsWith('http'));
          
          return {
            url: window.location.href,
            title,
            content: text.substring(0, 50000), // Limit size
            text: text.substring(0, 50000),
            html: html.substring(0, 200000), // Limit HTML size
            images: images.slice(0, 20),
            links: links.slice(0, 50),
            timestamp: Date.now(),
            success: true
          };
        } catch (e) {
          return {
            url: window.location.href,
            title: document.title || '',
            content: '',
            text: '',
            error: e.message,
            timestamp: Date.now(),
            success: false
          };
        }
      })();
    `;

    // Post message to iframe to execute script
    return new Promise<LiveScrapeResult | null>(resolve => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        console.warn('[LiveTabScraper] Scrape timeout after 5s');
        resolve(null);
      }, 5000);

      const handleMessage = (event: MessageEvent) => {
        // Security: Verify message source if possible
        if (event.data?.type === 'scrape:result') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          const result = event.data.result as LiveScrapeResult;
          if (result?.success) {
            console.debug('[LiveTabScraper] Scraped via postMessage:', result.url);
          }
          resolve(result);
        }
      };

      window.addEventListener('message', handleMessage);

      // Send scrape command to iframe
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: 'scrape:execute',
            script: scrapeScript,
          },
          '*' // Note: In production, should use specific origin
        );
      }

      // Also try direct execution if same-origin, or use browserScrape function
      try {
        // Try browserScrape function first (if injected by BrowserAutomationBridge)
        const browserScrape = (iframe.contentWindow as any)?.browserScrape;
        if (typeof browserScrape === 'function') {
          const result = browserScrape();
          if (result) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);
            console.debug('[LiveTabScraper] Scraped via browserScrape():', result.url);
            resolve(result as LiveScrapeResult);
            return;
          }
        }

        // Fallback: try eval (only works same-origin)
        if (iframe.contentWindow && 'eval' in iframe.contentWindow) {
          const result = (iframe.contentWindow as any).eval(scrapeScript);
          if (result) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);
            console.debug('[LiveTabScraper] Scraped via eval:', result.url);
            resolve(result as LiveScrapeResult);
          }
        }
      } catch {
        // Cross-origin - wait for postMessage response
        console.debug('[LiveTabScraper] Cross-origin, waiting for postMessage response');
      }
    });
  } catch (error) {
    console.error('[LiveTabScraper] Failed to scrape active tab:', error);
    return null;
  }
}

/**
 * Scrape via Tauri IPC (if in Tauri runtime)
 */
async function scrapeViaTauri(url: string): Promise<LiveScrapeResult | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<LiveScrapeResult>('scrape_tab_content', { url });
    if (result?.success) {
      console.debug('[LiveTabScraper] Scraped via Tauri IPC:', result.url);
    }
    return result;
  } catch (error) {
    console.debug('[LiveTabScraper] Tauri scrape not available:', error);
    return null;
  }
}

/**
 * Scrape specific URL (opens in background if needed)
 */
export async function scrapeUrl(url: string): Promise<LiveScrapeResult | null> {
  if (!url || !url.startsWith('http')) {
    console.warn('[LiveTabScraper] Invalid URL for scraping:', url);
    return null;
  }

  // First try to find existing tab with this URL
  const tabsState = getTabsState();
  const existingTab = tabsState.tabs.find(t => t.url === url);

  if (existingTab) {
    // Switch to that tab and scrape
    tabsState.setActive(existingTab.id);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for tab to load
    return scrapeActiveTab();
  }

  // Fallback: Use research scraper service
  try {
    const { scrapeResearchSources } = await import('./researchScraper');
    const results = await scrapeResearchSources([url]);

    if (results[0]) {
      return {
        url: results[0].url || url,
        title: results[0].title || '',
        content: results[0].content || results[0].excerpt || '',
        text: results[0].content || results[0].excerpt || '',
        timestamp: Date.now(),
        success: !results[0].error,
        error: results[0].error,
      };
    }
  } catch (error) {
    console.warn('[LiveTabScraper] Fallback scraper failed:', error);
  }

  return null;
}
