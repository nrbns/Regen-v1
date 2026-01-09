/**
 * Agent Context Builder
 * Builds rich context from current browser state
 */

export interface BrowserContext {
  selection?: string;
  title?: string;
  url?: string;
  visibleText?: string;
  recentHistory?: Array<{
    url: string;
    title: string;
    timestamp: number;
  }>;
  pageMetadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
  };
}

export interface AgentContext {
  intent: string;
  selection: string;
  page: {
    title: string;
    url: string;
    text: string;
  };
  history: BrowserContext['recentHistory'];
  metadata: BrowserContext['pageMetadata'];
  timestamp: number;
}

/**
 * Build comprehensive context for agent execution
 */
export function buildAgentContext(browserContext: BrowserContext, intent: string): AgentContext {
  return {
    intent,
    selection: browserContext.selection || '',
    page: {
      title: browserContext.title || 'Unknown Page',
      url: browserContext.url || '',
      text: browserContext.visibleText || '',
    },
    history: browserContext.recentHistory || [],
    metadata: browserContext.pageMetadata || {},
    timestamp: Date.now(),
  };
}

/**
 * Get current browser context (would integrate with browser APIs)
 */
export function getCurrentBrowserContext(): BrowserContext {
  // In a real implementation, this would:
  // - Get selected text via window.getSelection()
  // - Get page title, URL, visible text
  // - Get browsing history
  // - Extract page metadata

  return {
    selection: window.getSelection()?.toString() || '',
    title: document.title,
    url: window.location.href,
    visibleText: document.body?.textContent?.slice(0, 3000) || '',
    recentHistory: [], // Would come from browser history API
    pageMetadata: {
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',') || [],
      author: document.querySelector('meta[name="author"]')?.getAttribute('content') || '',
    },
  };
}

