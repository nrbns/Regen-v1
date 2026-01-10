/**
 * Agentic Action Parser - v0.4 Research Mode Fix
 * Parses agentic actions like [SCRAPE], [SUMMARIZE] from AI responses
 * and executes them automatically
 */

export type AgenticActionType =
  | 'SCRAPE'
  | 'SUMMARIZE'
  | 'SEARCH'
  | 'EXTRACT'
  | 'CHART'
  | 'NAVIGATE';

export interface AgenticAction {
  type: AgenticActionType;
  target?: string; // URL, selector, or query
  params?: Record<string, unknown>;
  raw: string; // Original action text
}

/**
 * Parse agentic actions from text (e.g., "[SCRAPE current page]")
 */
export function parseAgenticActions(text: string): AgenticAction[] {
  const actions: AgenticAction[] = [];

  // Pattern: [ACTION target params]
  const actionPattern = /\[(\w+)(?:\s+([^\]]+))?\]/gi;
  let match;

  while ((match = actionPattern.exec(text)) !== null) {
    const actionType = match[1].toUpperCase() as AgenticActionType;
    const rest = match[2] || '';

    // Parse target and params
    let target: string | undefined;
    const params: Record<string, unknown> = {};

    if (rest) {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(rest);
        if (typeof parsed === 'string') {
          target = parsed;
        } else if (typeof parsed === 'object') {
          Object.assign(params, parsed);
          target = parsed.url || parsed.target || parsed.selector;
        }
      } catch {
        // Not JSON - treat as target string
        target = rest.trim();
      }
    }

    actions.push({
      type: actionType,
      target,
      params,
      raw: match[0],
    });
  }

  return actions;
}

/**
 * Execute agentic action
 */
export async function executeAgenticAction(
  action: AgenticAction,
  context?: { activeTabUrl?: string; query?: string }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    switch (action.type) {
      case 'SCRAPE':
        return await executeScrapeAction(action, context);
      case 'SUMMARIZE':
        return await executeSummarizeAction(action, context);
      case 'SEARCH':
        return await executeSearchAction(action, context);
      case 'EXTRACT':
        return await executeExtractAction(action, context);
      case 'CHART':
        return await executeChartAction(action, context);
      case 'NAVIGATE':
        return await executeNavigateAction(action, context);
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    };
  }
}

/**
 * Execute SCRAPE action
 */
async function executeScrapeAction(
  action: AgenticAction,
  context?: { activeTabUrl?: string }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const { scrapeActiveTab, scrapeUrl } = await import('./liveTabScraper');

  const target = action.target || context?.activeTabUrl || 'current';

  if (target === 'current' || !target.startsWith('http')) {
    const result = await scrapeActiveTab();
    if (result) {
      return { success: true, result };
    }
    return { success: false, error: 'Failed to scrape active tab' };
  }

  const result = await scrapeUrl(target);
  if (result) {
    return { success: true, result };
  }
  return { success: false, error: 'Failed to scrape URL' };
}

/**
 * Execute SUMMARIZE action
 */
async function executeSummarizeAction(
  action: AgenticAction,
  _context?: { activeTabUrl?: string }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const { aiEngine } = await import('../core/ai');
  const { scrapeActiveTab } = await import('./liveTabScraper');

  // Get content to summarize
  let content = '';

  if (action.target === 'current' || !action.target) {
    const scraped = await scrapeActiveTab();
    content = scraped?.text || scraped?.content || '';
  } else {
    const { scrapeUrl } = await import('./liveTabScraper');
    const scraped = await scrapeUrl(action.target);
    content = scraped?.text || scraped?.content || '';
  }

  if (!content) {
    return { success: false, error: 'No content to summarize' };
  }

  const summary = await aiEngine.runTask({
    kind: 'summary',
    prompt: `Summarize this content:\n\n${content.substring(0, 10000)}`,
    mode: 'research',
  });

  return { success: true, result: summary.text };
}

/**
 * Execute SEARCH action
 */
async function executeSearchAction(
  action: AgenticAction,
  context?: { query?: string }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const query = action.target || context?.query || '';
  if (!query) {
    return { success: false, error: 'No search query provided' };
  }

  // Trigger research search
  window.dispatchEvent(
    new CustomEvent('research:search', {
      detail: { query },
    })
  );

  return { success: true, result: { query, triggered: true } };
}

/**
 * Execute EXTRACT action
 */
async function executeExtractAction(
  action: AgenticAction,
  _context?: { activeTabUrl?: string }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const selector = action.target || (action.params?.selector as string);
  if (!selector) {
    return { success: false, error: 'No selector provided' };
  }

  // Extract from active tab
  const { scrapeActiveTab } = await import('./liveTabScraper');
  const scraped = await scrapeActiveTab();

  if (!scraped?.html) {
    return { success: false, error: 'No HTML available to extract from' };
  }

  // Parse HTML and extract
  const parser = new DOMParser();
  const doc = parser.parseFromString(scraped.html, 'text/html');
  const element = doc.querySelector(selector);

  if (!element) {
    return { success: false, error: `Element not found: ${selector}` };
  }

  return {
    success: true,
    result: {
      text: element.textContent,
      html: element.outerHTML,
      attributes: Array.from(element.attributes).reduce(
        (acc, attr) => ({ ...acc, [attr.name]: attr.value }),
        {}
      ),
    },
  };
}

/**
 * Execute CHART action
 */
async function executeChartAction(
  action: AgenticAction,
  _context?: unknown
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  // Switch to trade mode and load symbol
  const symbol = action.target || 'NIFTY50';
  window.dispatchEvent(
    new CustomEvent('mode:switch', {
      detail: { mode: 'Trade', symbol },
    })
  );

  return { success: true, result: { mode: 'Trade', symbol } };
}

/**
 * Execute NAVIGATE action
 */
async function executeNavigateAction(
  action: AgenticAction,
  _context?: unknown
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const url = action.target;
  if (!url) {
    return { success: false, error: 'No URL provided' };
  }

  // FIX: Route navigation through CommandController (backend-owned)
  // Don't update tabs directly - CommandController will handle navigation and emit confirmation
  try {
    const { useCommandController } = await import('../hooks/useCommandController');
    const { executeCommand } = useCommandController();
    
    const result = await executeCommand(`navigate ${url}`, {
      currentUrl: window.location.href,
    });

    if (result.success) {
      return { success: true, result: { url, navigated: true } };
    } else {
      return { success: false, error: result.message || 'Navigation failed' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Navigation failed',
    };
  }
}
