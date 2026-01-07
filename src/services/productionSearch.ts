/**
 * Production Search Service
 * Connects frontend to production-grade /api/search and /api/summarize endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

export interface ProductionSearchResult {
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
}

export interface ProductionSearchResponse {
  ok: boolean;
  query: string;
  queryNormalized: string;
  intent: {
    type: 'question' | 'search' | 'definition' | 'comparison' | 'howto';
    confidence: number;
  };
  complexity: number;
  results: ProductionSearchResult[];
  count: number;
  cached: boolean;
  latency_ms: number;
}

export interface ProductionSummary {
  url: string;
  title: string;
  summary: string;
  bullets?: string[];
  excerpt?: string;
  citations?: Array<{ url: string; title: string }>;
  model?: string;
  tokensUsed?: number;
  error?: string;
}

export interface ProductionSummarizeResponse {
  ok: boolean;
  summaries: ProductionSummary[];
  cached: boolean;
  latency_ms: number;
}

export interface SearchOptions {
  lang?: string;
  maxResults?: number;
  extractContent?: boolean;
  sources?: string[];
  timeout?: number; // Timeout in milliseconds
}

export interface SummarizeOptions {
  query?: string; // Optional context query for focused summarization
  language?: string;
  maxLength?: number;
  includeBullets?: boolean;
  includeCitations?: boolean;
  timeout?: number;
}

/**
 * Production search API
 */
export async function productionSearch(
  query: string,
  options: SearchOptions = {}
): Promise<ProductionSearchResponse> {
  const {
    lang = 'auto',
    maxResults = 10,
    extractContent = false,
    sources,
    timeout = 8000,
  } = options;

  if (!query || query.trim().length < 2) {
    throw new Error('Query must be at least 2 characters');
  }

  // Auto-translate query if user's language is not English
  let finalQuery = query.trim();
  try {
    const { translateQueryForSearch } = await import('./queryTranslation');
    finalQuery = await translateQueryForSearch(finalQuery);
  } catch (error) {
    // Continue with original query if translation fails
    console.warn('[ProductionSearch] Query translation failed, using original:', error);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: finalQuery,
        lang,
        maxResults,
        extractContent,
        sources,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Search failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as ProductionSearchResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Search timeout after ${timeout}ms`);
    }

    throw new Error(error.message || 'Search request failed');
  }
}

/**
 * Production search API (GET method)
 */
export async function productionSearchGet(
  query: string,
  options: SearchOptions = {}
): Promise<ProductionSearchResponse> {
  const {
    lang = 'auto',
    maxResults = 10,
    timeout = 8000,
  } = options;

  if (!query || query.trim().length < 2) {
    throw new Error('Query must be at least 2 characters');
  }

  const params = new URLSearchParams({
    q: query.trim(),
    lang,
    maxResults: maxResults.toString(),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Search failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as ProductionSearchResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Search timeout after ${timeout}ms`);
    }

    throw new Error(error.message || 'Search request failed');
  }
}

/**
 * Production summarize API
 */
export async function productionSummarize(
  urls: string | string[],
  options: SummarizeOptions = {}
): Promise<ProductionSummarizeResponse> {
  const {
    query,
    language = 'auto',
    maxLength = 500,
    includeBullets = true,
    includeCitations = true,
    timeout = 15000, // Summarization takes longer
  } = options;

  const urlArray = Array.isArray(urls) ? urls : [urls];

  if (urlArray.length === 0) {
    throw new Error('At least one URL is required');
  }

  // Validate URLs
  const validUrls = urlArray.filter(url => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });

  if (validUrls.length === 0) {
    throw new Error('No valid URLs provided');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/summarize/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: validUrls,
        query,
        language,
        maxLength,
        includeBullets,
        includeCitations,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Summarization failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as ProductionSummarizeResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Summarization timeout after ${timeout}ms`);
    }

    throw new Error(error.message || 'Summarization request failed');
  }
}

/**
 * Combined search + summarize in one call
 * Useful for research queries that need both search and summaries
 */
export async function productionSearchAndSummarize(
  query: string,
  options: SearchOptions & SummarizeOptions & { summarizeTopN?: number } = {}
): Promise<{
  search: ProductionSearchResponse;
  summaries?: ProductionSummarizeResponse;
}> {
  const { summarizeTopN = 3, ...searchOptions } = options;

  // First, perform search
  const searchResponse = await productionSearch(query, searchOptions);

  // Optionally summarize top results
  let summaries: ProductionSummarizeResponse | undefined;
  if (summarizeTopN > 0 && searchResponse.results.length > 0) {
    try {
      const topUrls = searchResponse.results
        .slice(0, summarizeTopN)
        .map(r => r.url)
        .filter(Boolean);

      if (topUrls.length > 0) {
        summaries = await productionSummarize(topUrls, {
          query,
          language: searchOptions.lang,
          maxLength: options.maxLength,
          includeBullets: options.includeBullets,
          includeCitations: options.includeCitations,
        });
      }
    } catch (error) {
      console.warn('[ProductionSearch] Summarization failed:', error);
      // Continue without summaries - search results are still useful
    }
  }

  return {
    search: searchResponse,
    summaries,
  };
}

/**
 * Check if production search API is available
 */
export async function checkProductionSearchHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

