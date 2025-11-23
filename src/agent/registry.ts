/**
 * Agent Tool Registry - Tier 2
 * Registry of available tools for OmniAgent
 */

import { log } from '../utils/logger';
import { cacheManager } from '../core/cache';
import { metricsCollector } from '../core/observability';

export type AgentTool = (input: unknown) => Promise<unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  execute: AgentTool;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    log.info(`[AgentRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

/**
 * Built-in tools
 */

// Scrape a page
toolRegistry.register({
  name: 'scrapePage',
  description: 'Scrape content from a URL',
  execute: async (input: unknown) => {
    const { url } = input as { url: string };
    if (!url) throw new Error('URL required');

    // Check cache first
    const cacheKey = `scrape:${url}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      log.debug(`[AgentTool] Cache hit for scrape: ${url}`);
      return cached;
    }

    // For now, use IPC to scrape (or mock)
    try {
      const startTime = performance.now();
      // In Electron, use ipc.scrape.enqueue
      // For web, we'd need a backend API
      const result = {
        url,
        title: 'Scraped Page',
        content: 'Mock content - implement actual scraping',
        scrapedAt: Date.now(),
      };

      const duration = performance.now() - startTime;
      metricsCollector.recordScrape({
        url,
        duration,
        size: JSON.stringify(result).length,
        cached: false,
        timestamp: Date.now(),
      });

      // Cache result
      await cacheManager.set(cacheKey, result, { ttl: 3600000 }); // 1 hour

      return result;
    } catch (error) {
      log.error(`[AgentTool] Failed to scrape: ${url}`, error);
      throw error;
    }
  },
});

// Summarize text
toolRegistry.register({
  name: 'summarizeText',
  description: 'Summarize text content',
  execute: async (input: unknown) => {
    const { text, maxLength = 200 } = input as { text: string; maxLength?: number };
    if (!text) throw new Error('Text required');

    // For now, simple truncation
    // In production, use AI model
    const summary = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;

    return {
      summary,
      originalLength: text.length,
      summaryLength: summary.length,
    };
  },
});

// Search web (mock for now)
toolRegistry.register({
  name: 'searchWeb',
  description: 'Search the web for information',
  execute: async (input: unknown) => {
    const { query, maxResults = 5 } = input as { query: string; maxResults?: number };
    if (!query) throw new Error('Query required');

    // Mock search results
    // In production, use actual search API
    return {
      query,
      results: Array.from({ length: maxResults }, (_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        url: `https://example.com/result-${i + 1}`,
        snippet: `This is a mock search result for "${query}"`,
      })),
    };
  },
});
