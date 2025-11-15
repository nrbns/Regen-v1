/**
 * Search Proxy - Aggregates DuckDuckGo, Bing, and other search engines
 * Provides CORS-safe proxy and result summarization
 */

import fastify from 'fastify';

const server = fastify({ logger: true });

// CORS middleware (simplified, no plugin needed)
server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    reply.code(200).send();
    return;
  }
});

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: 'duckduckgo' | 'bing' | 'brave';
}

interface AggregatedSearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  sources: string[];
  timestamp: number;
}

/**
 * Search DuckDuckGo (no API key needed)
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      headers: {
        'User-Agent': 'OmniBrowser/1.0',
      },
    });

    if (!response.ok) {
      console.warn('[SearchProxy] DuckDuckGo request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    // DuckDuckGo instant answers
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: data.AbstractText,
        source: 'duckduckgo',
      });
    }

    // Related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'duckduckgo',
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('[SearchProxy] DuckDuckGo error:', error);
    return [];
  }
}

/**
 * Search Bing (requires API key)
 */
async function searchBing(query: string, apiKey?: string): Promise<SearchResult[]> {
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10&offset=0`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'User-Agent': 'OmniBrowser/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn('[SearchProxy] Bing request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.webPages && data.webPages.value) {
      for (const page of data.webPages.value) {
        results.push({
          title: page.name,
          url: page.url,
          snippet: page.snippet,
          source: 'bing',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[SearchProxy] Bing error:', error);
    return [];
  }
}

/**
 * Search Brave (requires API key)
 */
async function searchBrave(query: string, apiKey?: string): Promise<SearchResult[]> {
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&offset=0`,
      {
        headers: {
          'X-Subscription-Token': apiKey,
          'User-Agent': 'OmniBrowser/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn('[SearchProxy] Brave request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.web && data.web.results) {
      for (const page of data.web.results) {
        results.push({
          title: page.title,
          url: page.url,
          snippet: page.description,
          source: 'brave',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[SearchProxy] Brave error:', error);
    return [];
  }
}

/**
 * Deduplicate results by URL
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '');
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      unique.push(result);
    }
  }

  return unique;
}

/**
 * POST /api/search - Aggregate search from multiple engines
 */
server.post<{
  Body: { query: string; sources?: string[]; limit?: number };
}>('/api/search', async (request, reply) => {
  const { query, sources = ['duckduckgo', 'bing'], limit = 20 } = request.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return reply.code(400).send({ error: 'Query is required' });
  }

  const trimmedQuery = query.trim();

  // Get API keys from environment
  const bingApiKey = process.env.BING_API_KEY;
  const braveApiKey = process.env.BRAVE_API_KEY;

  // Search all sources in parallel
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (sources.includes('duckduckgo')) {
    searchPromises.push(searchDuckDuckGo(trimmedQuery));
  }

  if (sources.includes('bing') && bingApiKey) {
    searchPromises.push(searchBing(trimmedQuery, bingApiKey));
  }

  if (sources.includes('brave') && braveApiKey) {
    searchPromises.push(searchBrave(trimmedQuery, braveApiKey));
  }

  // Wait for all searches to complete
  const allResults = await Promise.all(searchPromises);
  const flattened = allResults.flat();

  // Deduplicate and limit
  const unique = deduplicateResults(flattened);
  const limited = unique.slice(0, limit);

  const response: AggregatedSearchResponse = {
    query: trimmedQuery,
    results: limited,
    total: limited.length,
    sources: Array.from(new Set(limited.map(r => r.source))),
    timestamp: Date.now(),
  };

  return reply.send(response);
});

/**
 * GET /api/duck - DuckDuckGo proxy (backward compatibility)
 */
server.get<{
  Querystring: { q: string };
}>('/api/duck', async (request, reply) => {
  const { q } = request.query;

  if (!q || typeof q !== 'string') {
    return reply.code(400).send({ error: 'Query parameter "q" is required' });
  }

  const results = await searchDuckDuckGo(q);

  return reply.send({
    query: q,
    results,
    total: results.length,
  });
});

/**
 * Health check
 */
server.get('/health', async (request, reply) => {
  return reply.send({ status: 'ok', timestamp: Date.now() });
});

/**
 * Start the server
 */
const PORT = process.env.SEARCH_PROXY_PORT || 3001;
const HOST = process.env.SEARCH_PROXY_HOST || '0.0.0.0';

async function start() {
  try {
    await server.listen({ port: Number(PORT), host: HOST });
    console.log(`[SearchProxy] Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  start();
}

export { server, start };

