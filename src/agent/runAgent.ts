/**
 * OmniAgent Runner - Tier 2
 * Executes agent tasks using registered tools
 */

import { toolRegistry } from './registry';
import { log } from '../utils/logger';
import { metricsCollector, traceFunction } from '../core/observability';
import { track } from '../services/analytics';

export type AgentTask =
  | { type: 'quick_summary'; url: string }
  | { type: 'deep_research'; topic: string; maxSources?: number }
  | { type: 'compare_urls'; urls: string[] }
  | { type: 'explain_page'; url: string };

export interface AgentResult {
  type: string;
  content: string;
  sources?: Array<{ url: string; title: string }>;
  metadata?: Record<string, unknown>;
}

/**
 * Run an agent task
 */
export async function runAgent(task: AgentTask): Promise<AgentResult> {
  return traceFunction(
    `agent:${task.type}`,
    async () => {
      const startTime = performance.now();
      track('agent_task_started', { taskType: task.type });

      try {
        let result: AgentResult;

        switch (task.type) {
          case 'quick_summary': {
            result = await handleQuickSummary(task);
            break;
          }
          case 'deep_research': {
            result = await handleDeepResearch(task);
            break;
          }
          case 'compare_urls': {
            result = await handleCompareUrls(task);
            break;
          }
          case 'explain_page': {
            result = await handleExplainPage(task);
            break;
          }
          default:
            throw new Error(`Unknown task type: ${(task as any).type}`);
        }

        const duration = performance.now() - startTime;
        metricsCollector.recordAgent({
          agentId: 'omnibrowser',
          runId: `run-${Date.now()}`,
          duration,
          success: true,
          timestamp: Date.now(),
        });

        track('agent_task_completed', { taskType: task.type, duration });
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        metricsCollector.recordAgent({
          agentId: 'omnibrowser',
          runId: `run-${Date.now()}`,
          duration,
          success: false,
          timestamp: Date.now(),
        });

        track('agent_task_failed', { taskType: task.type, error: String(error) });
        log.error('[Agent] Task failed', { task, error });
        throw error;
      }
    },
    { taskType: task.type }
  );
}

/**
 * Handle quick summary task
 */
async function handleQuickSummary(task: {
  type: 'quick_summary';
  url: string;
}): Promise<AgentResult> {
  const scrapeTool = toolRegistry.get('scrapePage');
  if (!scrapeTool) throw new Error('scrapePage tool not found');

  const scraped = (await scrapeTool.execute({ url: task.url })) as {
    title: string;
    content: string;
  };

  const summarizeTool = toolRegistry.get('summarizeText');
  if (!summarizeTool) throw new Error('summarizeText tool not found');

  const summary = (await summarizeTool.execute({
    text: scraped.content,
    maxLength: 300,
  })) as { summary: string };

  return {
    type: 'quick_summary',
    content: summary.summary,
    sources: [{ url: task.url, title: scraped.title }],
    metadata: {
      originalLength: scraped.content.length,
      summaryLength: summary.summary.length,
    },
  };
}

/**
 * Handle deep research task
 */
async function handleDeepResearch(task: {
  type: 'deep_research';
  topic: string;
  maxSources?: number;
}): Promise<AgentResult> {
  const maxSources = task.maxSources ?? 3;
  const searchTool = toolRegistry.get('searchWeb');
  if (!searchTool) throw new Error('searchWeb tool not found');

  const searchResults = (await searchTool.execute({
    query: task.topic,
    maxResults: maxSources,
  })) as {
    results: Array<{ title: string; url: string; snippet: string }>;
  };

  // Scrape top results
  const scrapeTool = toolRegistry.get('scrapePage');
  if (!scrapeTool) throw new Error('scrapePage tool not found');

  const sources = await Promise.all(
    searchResults.results.slice(0, maxSources).map(async result => {
      try {
        const scraped = (await scrapeTool.execute({ url: result.url })) as {
          title: string;
          content: string;
        };
        return { url: result.url, title: scraped.title || result.title };
      } catch (error) {
        log.warn(`[Agent] Failed to scrape ${result.url}`, error);
        return { url: result.url, title: result.title };
      }
    })
  );

  // Combine content
  const content = `Research on "${task.topic}":\n\n${searchResults.results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`)
    .join('\n\n')}`;

  return {
    type: 'deep_research',
    content,
    sources,
    metadata: {
      topic: task.topic,
      sourceCount: sources.length,
    },
  };
}

/**
 * Handle compare URLs task
 */
async function handleCompareUrls(task: {
  type: 'compare_urls';
  urls: string[];
}): Promise<AgentResult> {
  const scrapeTool = toolRegistry.get('scrapePage');
  if (!scrapeTool) throw new Error('scrapePage tool not found');

  const scraped = await Promise.all(
    task.urls.map(async url => {
      try {
        const result = (await scrapeTool.execute({ url })) as {
          title: string;
          content: string;
        };
        return { url, title: result.title, content: result.content };
      } catch (error) {
        log.warn(`[Agent] Failed to scrape ${url}`, error);
        return { url, title: 'Unknown', content: '' };
      }
    })
  );

  const content = `Comparison of ${task.urls.length} pages:\n\n${scraped
    .map((s, i) => `${i + 1}. ${s.title} (${s.url})\n   ${s.content.slice(0, 200)}...`)
    .join('\n\n')}`;

  return {
    type: 'compare_urls',
    content,
    sources: scraped.map(s => ({ url: s.url, title: s.title })),
    metadata: {
      urlCount: task.urls.length,
    },
  };
}

/**
 * Handle explain page task
 */
async function handleExplainPage(task: {
  type: 'explain_page';
  url: string;
}): Promise<AgentResult> {
  const result = await handleQuickSummary({ type: 'quick_summary', url: task.url });
  return {
    ...result,
    type: 'explain_page',
    content: `Explanation of ${result.sources?.[0]?.title || task.url}:\n\n${result.content}`,
  };
}
