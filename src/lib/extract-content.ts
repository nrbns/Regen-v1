/**
 * Extract page content - tries IPC first, falls back to HTTP API
 */

import { ipc } from './ipc-typed';
import { getEnvVar } from './env';

export interface ExtractResult {
  title: string;
  content: string;
  html?: string;
  excerpt?: string;
  lang?: string;
}

/**
 * Extract readable content from a URL or tab
 * Tries Electron IPC first, then falls back to HTTP API
 */
export async function extractContent(urlOrTabId: string): Promise<ExtractResult | null> {
  // Try IPC first (Electron)
  try {
    const result = await ipc.research.extractContent(urlOrTabId);
    if (result && (result.content || result.html)) {
      return result as ExtractResult;
    }
  } catch (error) {
    console.debug('[extract-content] IPC extraction failed, trying HTTP:', error);
  }

  // Fallback to HTTP API
  try {
    // If it's a tabId, we need to get the URL first
    let url = urlOrTabId;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Assume it's a tabId, try to get URL from tabs
      try {
        const tabs = await ipc.tabs.list();
        const tab = tabs.find((t: any) => t.id === urlOrTabId);
        if (tab?.url) {
          url = tab.url;
        } else {
          console.warn('[extract-content] Could not find tab or URL:', urlOrTabId);
          return null;
        }
      } catch (error) {
        console.warn('[extract-content] Failed to get tab URL:', error);
        return null;
      }
    }

    // Skip special pages
    if (url.startsWith('about:') || url.startsWith('chrome:')) {
      return null;
    }

    // Call HTTP API
    const apiBaseUrl =
      getEnvVar('API_BASE_URL') ??
      getEnvVar('OMNIBROWSER_API_URL') ??
      getEnvVar('VITE_REDIX_HTTP_URL') ??
      'http://localhost:8000';

    const response = await fetch(`${apiBaseUrl}/extract/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Format response to match IPC format
    const formattedContent = data.content
      .split('\n\n')
      .filter((p: string) => p.trim().length > 0)
      .map((p: string) => `<p>${p.trim()}</p>`)
      .join('');

    return {
      title: data.title || url,
      content: data.content,
      html: `<div class="prose prose-invert max-w-none"><h1>${data.title || url}</h1>${formattedContent}</div>`,
      excerpt: data.excerpt,
      lang: data.lang || 'en',
    };
  } catch (error) {
    console.error('[extract-content] HTTP extraction failed:', error);
    return null;
  }
}

