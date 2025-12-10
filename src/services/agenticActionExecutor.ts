/**
 * Agentic Action Executor - v0.4 Week 1
 * Chains voice commands → scrape/trade actions with parallel AI reasoning
 *
 * Enables: "Trade NIFTY" → scrape news + simulate order
 *          "Research AI" → scrape sources + summarize in parallel
 */

import { parseResearchVoiceCommand, type ParsedVoiceCommand } from '../utils/voiceCommandParser';
import { scrapeResearchSources, type ScrapedSourceResult } from './researchScraper';
import { aiEngine } from '../core/ai';
import { toast } from '../utils/toast';
import { useTabsStore } from '../state/tabsStore';

export interface AgenticActionResult {
  success: boolean;
  action: ParsedVoiceCommand['action'];
  results?: {
    scraped?: ScrapedSourceResult[];
    aiReasoning?: string;
    aiSummary?: string;
    tradeSimulated?: boolean;
  };
  error?: string;
}

/**
 * Execute agentic action chain from voice command
 *
 * Examples:
 * - "Trade NIFTY" → scrape news → reason → simulate
 * - "Research AI" → scrape sources → reason + summarize in parallel
 * - "Scrape current page" → extract → summarize
 */
export async function executeAgenticAction(
  voiceText: string,
  context?: { mode?: string; activeTabUrl?: string }
): Promise<AgenticActionResult> {
  const parsed = parseResearchVoiceCommand(voiceText);

  if (!parsed.action) {
    return {
      success: false,
      action: undefined,
      error: 'No actionable intent detected',
    };
  }

  const { action } = parsed;

  try {
    // Trade action: scrape + reason + simulate
    if (action.type === 'trade') {
      return await executeTradeAction(action, context);
    }

    // Scrape action: extract + summarize
    if (action.type === 'scrape') {
      return await executeScrapeAction(action, context);
    }

    // Research action: scrape + reason + summarize (parallel)
    if (action.type === 'research') {
      return await executeResearchAction(action, context);
    }

    return {
      success: false,
      action,
      error: 'Unknown action type',
    };
  } catch (error) {
    console.error('[AgenticAction] Execution failed:', error);
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Execution failed',
    };
  }
}

/**
 * Execute trade action: scrape news → reason → simulate order
 */
async function executeTradeAction(
  action: NonNullable<ParsedVoiceCommand['action']>,
  _context?: { mode?: string; activeTabUrl?: string }
): Promise<AgenticActionResult> {
  const symbol = action.target || 'NIFTY50';
  toast.info(`Executing trade action for ${symbol}...`);

  // Step 1: Scrape relevant news/sources (parallel with AI reasoning)
  const searchQuery = `${symbol} latest news analysis`;
  const [scrapedResults, aiResults] = await Promise.all([
    // Scrape news sources
    scrapeResearchSources([
      `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
    ]).catch(() => []),
    // Parallel AI reasoning about trade
    aiEngine
      .runReasonAndSummary(
        `Should I ${action.params?.side || 'trade'} ${symbol}? Current market conditions and analysis.`,
        { mode: 'trade' }
      )
      .catch(() => ({ reasoning: { text: '' }, summary: { text: '' } })),
  ]);

  // Step 2: Emit trade event (simulation - no real orders)
  // Trade mode listens for 'agent:trade-action' event
  const tradeEvent = new CustomEvent('agent:trade-action', {
    detail: {
      intent: action.params?.side || 'buy',
      action: action.params?.side || 'buy',
      symbol,
      quantity: action.params?.quantity || 1,
      reasoning: aiResults.reasoning?.text,
      sources: scrapedResults,
    },
  });
  window.dispatchEvent(tradeEvent);

  toast.success(`Trade action simulated: ${action.params?.side || 'buy'} ${symbol}`);

  return {
    success: true,
    action,
    results: {
      scraped: scrapedResults,
      aiReasoning: aiResults.reasoning?.text,
      aiSummary: aiResults.summary?.text,
      tradeSimulated: true,
    },
  };
}

/**
 * Execute scrape action: extract content → summarize
 */
async function executeScrapeAction(
  action: NonNullable<ParsedVoiceCommand['action']>,
  context?: { mode?: string; activeTabUrl?: string }
): Promise<AgenticActionResult> {
  const target = action.target || context?.activeTabUrl || '';

  if (!target || target === 'current') {
    // Scrape current active tab
    const tabsState = useTabsStore.getState();
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);
    const url = activeTab?.url;

    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        action,
        error: 'No valid URL to scrape',
      };
    }

    toast.info('Scraping current page...');
    const scraped = await scrapeResearchSources([url]);

    if (scraped[0]?.content) {
      // Summarize in parallel with extraction
      const summary = await aiEngine
        .runTask({
          kind: 'summary',
          prompt: `Summarize this page:\n${scraped[0].content.substring(0, 5000)}`,
          mode: 'research',
        })
        .catch(() => ({ text: 'Summary unavailable' }));

      toast.success('Page scraped and summarized');

      // Emit scrape result event
      window.dispatchEvent(
        new CustomEvent('agent:scrape-complete', {
          detail: { url, scraped: scraped[0], summary: summary.text },
        })
      );

      return {
        success: true,
        action,
        results: {
          scraped,
          aiSummary: summary.text,
        },
      };
    }
  } else if (target.startsWith('http')) {
    // Scrape specific URL
    toast.info(`Scraping ${target}...`);
    const scraped = await scrapeResearchSources([target]);
    const summary = await aiEngine
      .runTask({
        kind: 'summary',
        prompt: `Summarize:\n${scraped[0]?.content?.substring(0, 5000) || ''}`,
      })
      .catch(() => ({ text: 'Summary unavailable' }));

    return {
      success: true,
      action,
      results: {
        scraped,
        aiSummary: summary.text,
      },
    };
  }

  return {
    success: false,
    action,
    error: 'Invalid scrape target',
  };
}

/**
 * Execute research action: scrape sources → reason + summarize in parallel
 */
async function executeResearchAction(
  action: NonNullable<ParsedVoiceCommand['action']>,
  _context?: { mode?: string; activeTabUrl?: string }
): Promise<AgenticActionResult> {
  const query = action.target || '';
  toast.info(`Researching: ${query}...`);

  // Step 1: Scrape multiple sources in parallel
  const searchUrls = [
    `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  ];

  const scrapedPromise = Promise.all(
    searchUrls.map(url => scrapeResearchSources([url]).catch(() => []))
  ).then(results => results.flat());

  // Step 2: Parallel AI reasoning + summarization
  const aiPromise = aiEngine.runReasonAndSummary(
    `Research query: ${query}\n\nProvide analysis and summary.`,
    { mode: 'research', context: { query } }
  );

  // Wait for both to complete
  const [scrapedResults, aiResults] = await Promise.all([scrapedPromise, aiPromise]);

  toast.success('Research complete');

  // Emit research result event
  window.dispatchEvent(
    new CustomEvent('agent:research-complete', {
      detail: {
        query,
        sources: scrapedResults,
        reasoning: aiResults.reasoning?.text,
        summary: aiResults.summary?.text,
      },
    })
  );

  return {
    success: true,
    action,
    results: {
      scraped: scrapedResults,
      aiReasoning: aiResults.reasoning?.text,
      aiSummary: aiResults.summary?.text,
    },
  };
}
