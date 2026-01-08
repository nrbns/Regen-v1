/**
 * Optimized Multi-Engine Search Service
 * Tries multiple search engines with intelligent fallbacks
 * Works with any query/name and optimizes results
 */

import {
  fetchDuckDuckGoInstant,
  fetchDuckDuckGoWeb,
  formatDuckDuckGoResults,
} from './duckDuckGoSearch';
import { fetchBingSearch, formatBingResults } from './bingSearch';
import { multiSourceSearch } from './multiSourceSearch';
import { performLiveWebSearch } from './liveWebSearch';
import { searchLocal } from '../utils/lunrIndex';

export interface OptimizedSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  provider: 'duckduckgo' | 'bing' | 'brave' | 'multi' | 'local' | 'fallback';
  score: number;
  timestamp: number;
}

export interface OptimizedSearchOptions {
  count?: number;
  language?: string;
  timeout?: number; // Timeout in milliseconds
  preferProvider?: 'duckduckgo' | 'bing' | 'brave' | 'multi' | 'auto';
}

const DEFAULT_TIMEOUT = 8000; // 8 seconds
const DEFAULT_COUNT = 10;

/**
 * Optimized search that tries multiple engines with intelligent fallbacks
 * Guarantees results for any query/name
 */
export async function optimizedSearch(
  query: string,
  options?: OptimizedSearchOptions
): Promise<OptimizedSearchResult[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const normalizedQuery = query.trim();
  const count = options?.count || DEFAULT_COUNT;
  const language = options?.language;
  const timeout = options?.timeout || DEFAULT_TIMEOUT;
  const preferProvider = options?.preferProvider || 'auto';

  // Strategy: Try multiple engines in parallel, use first successful result
  const searchPromises: Array<Promise<OptimizedSearchResult[]>> = [];

  // 1. Try backend hybrid search (Brave/Bing/Multi-source) - fastest and most reliable
  if (preferProvider === 'auto' || preferProvider === 'brave' || preferProvider === 'multi') {
    searchPromises.push(
      multiSourceSearch(normalizedQuery, { limit: count, language })
        .then(results =>
          results.map((r, idx) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            domain: r.domain,
            provider: (r.source === 'brave'
              ? 'brave'
              : r.source === 'bing'
                ? 'bing'
                : 'multi') as OptimizedSearchResult['provider'],
            score: r.score || 0.9 - idx * 0.05,
            timestamp: Date.now(),
          }))
        )
        .catch(() => [])
    );
  }

  // 2. Try DuckDuckGo Web Search (no API key needed)
  if (preferProvider === 'auto' || preferProvider === 'duckduckgo') {
    searchPromises.push(
      fetchDuckDuckGoWeb(normalizedQuery, { count, language })
        .then(results =>
          results.map((r, idx) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            domain: r.domain,
            provider: 'duckduckgo' as const,
            score: 0.85 - idx * 0.05,
            timestamp: Date.now(),
          }))
        )
        .catch(() => [])
    );
  }

  // 3. Try Bing Search (if API key available)
  if (preferProvider === 'auto' || preferProvider === 'bing') {
    searchPromises.push(
      fetchBingSearch(normalizedQuery, { count, language })
        .then(results => {
          const formatted = formatBingResults(results);
          return formatted.map((r, idx) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            domain: r.domain,
            provider: 'bing' as const,
            score: 0.9 - idx * 0.05,
            timestamp: Date.now(),
          }));
        })
        .catch(() => [])
    );
  }

  // 4. Try Live Web Search (Bing + DuckDuckGo fallback)
  searchPromises.push(
    performLiveWebSearch(normalizedQuery, { count, language })
      .then(results =>
        results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          domain: r.domain,
          provider: r.provider === 'bing' ? 'bing' : 'duckduckgo',
          score: r.score,
          timestamp: Date.now(),
        }))
      )
      .catch(() => [])
  );

  // 5. Try DuckDuckGo Instant Answer API (always available, limited results)
  searchPromises.push(
    fetchDuckDuckGoInstant(normalizedQuery, language)
      .then(result => {
        if (!result) return [];
        const formatted = formatDuckDuckGoResults(result);
        return formatted
          .filter(f => f.url && f.type === 'result')
          .slice(0, count)
          .map((f, idx) => {
            try {
              const urlObj = new URL(f.url!);
              return {
                title: f.title,
                url: f.url!,
                snippet: f.snippet,
                domain: urlObj.hostname.replace(/^www\./, ''),
                provider: 'duckduckgo' as const,
                score: 0.75 - idx * 0.05,
                timestamp: Date.now(),
              };
            } catch {
              return {
                title: f.title,
                url: f.url!,
                snippet: f.snippet,
                domain: '',
                provider: 'duckduckgo' as const,
                score: 0.75 - idx * 0.05,
                timestamp: Date.now(),
              };
            }
          });
      })
      .catch(() => [])
  );

  // 6. Try local search (offline fallback)
  searchPromises.push(
    searchLocal(normalizedQuery)
      .then(results =>
        results.map((r, idx) => ({
          title: r.title,
          url: '', // Local results don't have URLs
          snippet: r.snippet,
          domain: 'local',
          provider: 'local' as const,
          score: 0.7 - idx * 0.03,
          timestamp: Date.now(),
        }))
      )
      .catch(() => [])
  );

  // Race: Use first successful result, or combine all if needed
  try {
    const results = await Promise.race([
      Promise.allSettled(searchPromises).then(settled => {
        // Find first successful result
        for (const result of settled) {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            return result.value;
          }
        }
        // If no single provider succeeded, combine all results
        const allResults: OptimizedSearchResult[] = [];
        for (const result of settled) {
          if (result.status === 'fulfilled') {
            allResults.push(...result.value);
          }
        }
        return allResults;
      }),
      new Promise<OptimizedSearchResult[]>((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), timeout)
      ),
    ]);

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduplicated = results
      .filter(r => {
        if (!r.url || seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
      })
      .sort((a, b) => b.score - a.score) // Sort by score
      .slice(0, count);

    return deduplicated.length > 0 ? deduplicated : getFallbackResults(normalizedQuery, count);
  } catch (error) {
    console.warn('[OptimizedSearch] All search engines failed, using fallback:', error);
    return getFallbackResults(normalizedQuery, count);
  }
}

/**
 * Generate fallback results when all search engines fail
 * Creates synthetic results based on query
 */
function getFallbackResults(query: string, count: number): OptimizedSearchResult[] {
  // Try one more time with DuckDuckGo Instant (most reliable)
  const fallbackProvider: OptimizedSearchResult['provider'] = 'fallback';
  return [
    {
      title: `Search results for "${query}"`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: `Click to search "${query}" on DuckDuckGo directly.`,
      domain: 'duckduckgo.com',
      provider: fallbackProvider,
      score: 0.5,
      timestamp: Date.now(),
    },
    {
      title: `Google Search: ${query}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Click to search "${query}" on Google.`,
      domain: 'google.com',
      provider: fallbackProvider,
      score: 0.5,
      timestamp: Date.now(),
    },
    {
      title: `Bing Search: ${query}`,
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Click to search "${query}" on Bing.`,
      domain: 'bing.com',
      provider: fallbackProvider,
      score: 0.5,
      timestamp: Date.now(),
    },
  ].slice(0, count);
}

/**
 * Quick search - tries fastest providers first
 */
export async function quickSearch(
  query: string,
  options?: OptimizedSearchOptions
): Promise<OptimizedSearchResult[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const normalizedQuery = query.trim();
  const count = options?.count || 5; // Fewer results for quick search
  const language = options?.language;

  // Try fastest providers first
  try {
    // 1. Backend hybrid search (fastest)
    const hybridResults = await multiSourceSearch(normalizedQuery, { limit: count, language });
    if (hybridResults.length > 0) {
      return hybridResults.map((r, idx) => {
        let provider: OptimizedSearchResult['provider'] = 'multi';
        if (r.source === 'brave') provider = 'brave';
        else if (r.source === 'bing') provider = 'bing';
        else if (r.source === 'duckduckgo') provider = 'duckduckgo';

        return {
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          domain: r.domain,
          provider,
          score: r.score || 0.9 - idx * 0.05,
          timestamp: Date.now(),
        };
      });
    }
  } catch {
    // Continue to next provider
  }

  // 2. DuckDuckGo Instant (always available)
  try {
    const instantResult = await fetchDuckDuckGoInstant(normalizedQuery, language);
    if (instantResult) {
      const formatted = formatDuckDuckGoResults(instantResult);
      const results = formatted
        .filter(f => f.url && f.type === 'result')
        .slice(0, count)
        .map((f, idx) => {
          try {
            const urlObj = new URL(f.url!);
            return {
              title: f.title,
              url: f.url!,
              snippet: f.snippet,
              domain: urlObj.hostname.replace(/^www\./, ''),
              provider: 'duckduckgo' as const,
              score: 0.85 - idx * 0.05,
              timestamp: Date.now(),
            };
          } catch {
            return {
              title: f.title,
              url: f.url!,
              snippet: f.snippet,
              domain: '',
              provider: 'duckduckgo' as const,
              score: 0.85 - idx * 0.05,
              timestamp: Date.now(),
            };
          }
        });
      if (results.length > 0) return results;
    }
  } catch {
    // Continue to fallback
  }

  // 3. Fallback
  return getFallbackResults(normalizedQuery, count);
}

/**
 * Check which search providers are available
 */
export async function checkSearchProviders(): Promise<{
  duckduckgo: boolean;
  bing: boolean;
  brave: boolean;
  multi: boolean;
  local: boolean;
}> {
  const bingKey = import.meta.env.VITE_BING_API_KEY || (window as any).__BING_API_KEY;
  const hasBing = bingKey && bingKey !== 'your_bing_api_key_here';

  // Test DuckDuckGo
  let hasDuckDuckGo = false;
  try {
    const testResult = await fetchDuckDuckGoInstant('test', 'en');
    hasDuckDuckGo = testResult !== null;
  } catch {
    hasDuckDuckGo = false;
  }

  // Test backend hybrid search
  let hasBrave = false;
  let hasMulti = false;
  try {
    const testResults = await multiSourceSearch('test', { limit: 1 });
    hasBrave = testResults.some(r => r.source === 'brave');
    hasMulti = testResults.length > 0;
  } catch {
    hasBrave = false;
    hasMulti = false;
  }

  // Local search is always available
  const hasLocal = true;

  return {
    duckduckgo: hasDuckDuckGo,
    bing: hasBing,
    brave: hasBrave,
    multi: hasMulti,
    local: hasLocal,
  };
}
