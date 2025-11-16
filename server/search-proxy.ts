/**
 * Search Proxy - Aggregates DuckDuckGo, Bing, and other search engines
 * Provides CORS-safe proxy and result summarization with LLM summaries
 */

import fastify from 'fastify';

// LLM adapter functions adapted for Node.js server context
// Note: This is a simplified version that works in Node.js
async function sendPromptServer(
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    provider?: 'openai' | 'anthropic' | 'mistral' | 'ollama';
  } = {}
): Promise<{ text: string; latency?: number }> {
  const provider = options.provider || 'openai';
  const startTime = Date.now();

  // Get API key from environment (Node.js context)
  let apiKey: string | undefined;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  } else if (provider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  } else if (provider === 'mistral') {
    apiKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;
  }

  if (!apiKey && provider !== 'ollama') {
    throw new Error(`API key required for ${provider}`);
  }

  const messages: any[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model: provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'mistral-large-latest',
    messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature ?? 0.7,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey!;
    headers['anthropic-version'] = '2023-06-01';
  } else if (provider !== 'ollama') {
    headers['Authorization'] = `Bearer ${apiKey!}`;
  }

  const url = provider === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : provider === 'ollama'
    ? `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`
    : `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  const latency = Date.now() - startTime;

  const text = provider === 'anthropic'
    ? data.content[0]?.text || ''
    : data.choices?.[0]?.message?.content || data.message?.content || '';

  return { text, latency };
}

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
  summary?: {
    text: string;
    citations: Array<{ index: number; url: string; title: string }>;
  };
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
 * Generate LLM summary with citations from search results
 */
async function generateSummaryWithCitations(
  query: string,
  results: SearchResult[]
): Promise<{ text: string; citations: Array<{ index: number; url: string; title: string }> } | null> {
  if (results.length === 0) {
    return null;
  }

  try {
    // Format results for LLM
    const resultsText = results
      .slice(0, 5) // Use top 5 results
      .map((result, idx) => {
        return `[${idx + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`;
      })
      .join('\n\n');

    const prompt = `Based on the search results below, provide a concise summary answering: "${query}"

Search Results:
${resultsText}

Instructions:
- Summarize the key information from the results
- Use citation markers like [1], [2], etc. to reference specific results
- Keep the summary under 200 words
- Focus on accuracy and relevance

Summary:`;

    const response = await sendPromptServer(prompt, {
      maxTokens: 300,
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant that summarizes search results with accurate citations.',
    });

    // Extract citations from the response
    const citationRegex = /\[(\d+)\]/g;
    const citations: Set<number> = new Set();
    let match;
    while ((match = citationRegex.exec(response.text)) !== null) {
      const index = parseInt(match[1], 10) - 1; // Convert to 0-based index
      if (index >= 0 && index < results.length) {
        citations.add(index);
      }
    }

    const citationList = Array.from(citations)
      .sort((a, b) => a - b)
      .map((index) => ({
        index: index + 1, // Convert back to 1-based for display
        url: results[index].url,
        title: results[index].title,
      }));

    return {
      text: response.text,
      citations: citationList,
    };
  } catch (error) {
    console.error('[SearchProxy] LLM summary generation failed:', error);
    return null; // Fail gracefully - summary is optional
  }
}

/**
 * POST /api/search - Aggregate search from multiple engines
 */
server.post<{
  Body: { query: string; sources?: string[]; limit?: number; includeSummary?: boolean };
}>('/api/search', async (request, reply) => {
  const { query, sources = ['duckduckgo', 'bing'], limit = 20, includeSummary = false } = request.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return reply.code(400).send({ error: 'Query is required' });
  }

  const trimmedQuery = query.trim();
  const startTime = Date.now();

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

  // Generate summary if requested
  let summary: { text: string; citations: Array<{ index: number; url: string; title: string }> } | undefined;
  if (includeSummary && limited.length > 0) {
    summary = (await generateSummaryWithCitations(trimmedQuery, limited)) || undefined;
  }

  const searchLatency = Date.now() - startTime;
  console.log(`[SearchProxy] Search completed in ${searchLatency}ms for query: "${trimmedQuery}"`);

  const response: AggregatedSearchResponse = {
    query: trimmedQuery,
    results: limited,
    total: limited.length,
    sources: Array.from(new Set(limited.map(r => r.source))),
    timestamp: Date.now(),
    summary,
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
 * POST /api/llm - Generate LLM summary with citations from search results
 */
server.post<{
  Body: { query: string; results: SearchResult[] };
}>('/api/llm', async (request, reply) => {
  const { query, results } = request.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return reply.code(400).send({ error: 'Query is required' });
  }

  if (!Array.isArray(results) || results.length === 0) {
    return reply.code(400).send({ error: 'Results array is required' });
  }

  const startTime = Date.now();
  
  try {
    const summary = await generateSummaryWithCitations(query.trim(), results);
    const latency = Date.now() - startTime;
    
    console.log(`[SearchProxy] LLM summary generated in ${latency}ms for query: "${query}"`);

    if (!summary) {
      return reply.code(500).send({ error: 'Failed to generate summary' });
    }

    return reply.send({
      ...summary,
      latency,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[SearchProxy] LLM endpoint error:', error);
    return reply.code(500).send({
      error: error.message || 'Failed to generate summary',
    });
  }
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

