/* eslint-env node */
/**
 * Production Search API
 * Multi-source search with caching, ranking, and content extraction
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { multiSourceSearch } from '../services/research/multiSourceSearch.js';
import { normalizeQuery, detectIntent, getQueryComplexity } from '../lib/normalizeQuery.js';
import { applyRankingPipeline } from '../lib/ranker.js';
import { extractMultipleContent } from '../lib/extractors.js';
import { searchCache, getSearchCacheKey } from '../lib/cache.js';

interface SearchQuery {
  q: string;
  lang?: string;
  maxResults?: number;
  extractContent?: boolean;
  sources?: string[];
}

interface SearchResponse {
  ok: boolean;
  query: string;
  queryNormalized: string;
  intent: ReturnType<typeof detectIntent>;
  complexity: number;
  results: Array<{
    url: string;
    title: string;
    snippet: string;
    source: string;
    score: number;
    domain?: string;
    fetchedAt?: string;
    extractedContent?: {
      text?: string;
      excerpt?: string;
    };
  }>;
  count: number;
  cached: boolean;
  latency_ms: number;
}

/**
 * POST /api/search
 * Production search endpoint with caching, ranking, and content extraction
 */
export async function searchHandler(
  request: FastifyRequest<{ Body: SearchQuery }>,
  reply: FastifyReply
): Promise<SearchResponse> {
  const startTime = Date.now();
  let cached = false;

  try {
    const {
      q,
      lang = 'auto',
      maxResults = 10,
      extractContent: shouldExtract = false,
      sources,
    } = request.body;

    // Validate query
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return reply.code(400).send({
        ok: false,
        error: 'invalid_query',
        message: 'Query must be at least 2 characters',
      }) as any;
    }

    // Normalize query
    const normalized = normalizeQuery(q);
    if (normalized.terms.length === 0) {
      return reply.code(400).send({
        ok: false,
        error: 'invalid_query',
        message: 'Query must contain at least one meaningful term',
      }) as any;
    }

    // Detect intent and complexity
    const intent = detectIntent(q);
    const complexity = getQueryComplexity(q);

    // Check cache
    const cacheKey = getSearchCacheKey(q, lang, { maxResults, sources });
    let results = searchCache.get<SearchResponse['results']>(cacheKey);

    if (results) {
      cached = true;
    } else {
      // Perform multi-source search
      try {
        const searchOptions: Parameters<typeof multiSourceSearch>[1] = {
          lang,
          maxResults: maxResults * 2, // Get more for reranking
        };

        const rawResults = await multiSourceSearch(normalized.normalized, searchOptions);

        // Apply ranking pipeline
        results = applyRankingPipeline(
          rawResults.map(r => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            source: r.source || 'unknown',
            score: r.score || 0.5,
            fetchedAt: new Date().toISOString(),
          })),
          q,
          normalized.terms
        );

        // Limit to requested number
        results = results.slice(0, maxResults);

        // Cache results (1 hour TTL)
        searchCache.set(cacheKey, results, 3600);
      } catch (error: any) {
        console.error('[SearchAPI] Search failed:', error);
        return reply.code(500).send({
          ok: false,
          error: 'search_failed',
          message: error.message || 'Search failed',
        }) as any;
      }
    }

    // Extract content if requested (and not cached with content)
    if (shouldExtract && !cached) {
      try {
        // Extract content for top 3 results in parallel
        const topUrls = results.slice(0, 3).map(r => r.url);
        const extracted = await extractMultipleContent(topUrls, {
          concurrency: 3,
          timeout: 8000,
          maxLength: 10000,
        });

        // Merge extracted content into results
        results = results.map((result, _idx) => {
          const extractedItem = extracted.find(e => e.url === result.url);
          if (extractedItem && !extractedItem.error) {
            return {
              ...result,
              extractedContent: {
                text: extractedItem.text,
                excerpt: extractedItem.excerpt,
              },
            };
          }
          return result;
        });
      } catch (error: any) {
        console.warn('[SearchAPI] Content extraction failed:', error.message);
        // Continue without extracted content
      }
    }

    const latency = Date.now() - startTime;

    const response: SearchResponse = {
      ok: true,
      query: q,
      queryNormalized: normalized.normalized,
      intent,
      complexity,
      results,
      count: results.length,
      cached,
      latency_ms: latency,
    };

    return reply.send(response);
  } catch (error: any) {
    console.error('[SearchAPI] Unexpected error:', error);
    return reply.code(500).send({
      ok: false,
      error: 'internal_error',
      message: error.message || 'Internal server error',
      latency_ms: Date.now() - startTime,
    }) as any;
  }
}

/**
 * GET /api/search?q=...
 * Alternative GET endpoint for search
 */
export async function searchGetHandler(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply
): Promise<SearchResponse> {
  // Convert GET query params to POST body format
  const body = {
    q: request.query.q,
    lang: request.query.lang,
    maxResults: request.query.maxResults,
    extractContent: request.query.extractContent,
    sources: request.query.sources,
  };

  return searchHandler({ body } as any, reply);
}
