/* eslint-env node */
/**
 * Search Routes
 * Handles hybrid search and multi-source search endpoints
 */

import { multiSourceSearch } from '../services/research/multiSourceSearch.js';

/**
 * POST /api/search/hybrid
 * Hybrid search across multiple sources
 */
export async function hybridSearch(request, reply) {
  try {
    const { query, lang, maxResults = 6, maxSources = 6 } = request.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return reply.code(400).send({
        error: 'missing-query',
        message: 'Query must be at least 2 characters',
      });
    }

    const results = await multiSourceSearch(query.trim(), {
      lang: lang || 'auto',
      maxResults: maxResults || maxSources,
    });

    return reply.send({
      ok: true,
      results,
      query: query.trim(),
      count: results.length,
    });
  } catch (err) {
    console.error('[Search] Hybrid search error:', err);
    return reply.code(500).send({
      error: 'search_failed',
      message: err.message || 'Search failed',
    });
  }
}
