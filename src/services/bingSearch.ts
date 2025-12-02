/**
 * Bing Web Search API client
 * Requires BING_API_KEY environment variable
 */

export interface BingSearchResult {
  id: string;
  name: string;
  url: string;
  snippet: string;
  displayUrl: string;
  datePublished?: string;
  dateLastCrawled?: string;
}

export interface BingSearchResponse {
  webPages?: {
    value: BingSearchResult[];
    totalEstimatedMatches?: number;
  };
  rankingResponse?: any;
}

/**
 * Fetch web search results from Bing API
 */
export async function fetchBingSearch(
  query: string,
  options?: {
    count?: number;
    offset?: number;
    language?: string;
    market?: string;
  }
): Promise<BingSearchResult[]> {
  const apiKey = import.meta.env.VITE_BING_API_KEY || (window as any).__BING_API_KEY;

  if (!apiKey || apiKey === 'your_bing_api_key_here') {
    console.warn('[BingSearch] API key not configured');
    return [];
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const count = options?.count || 10;
    const offset = options?.offset || 0;
    const market = options?.market || options?.language || 'en-US';

    // Use backend proxy instead of direct Bing API call
    // This avoids Tracking Prevention and keeps API keys secure
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const proxyUrl = `${API_BASE}/api/proxy/bing/search`;

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        q: query.trim(),
        count,
        offset,
        mkt: market,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.fallback) {
        console.warn('[BingSearch] Bing API unavailable, using fallback:', errorData.message);
      } else {
        console.warn('[BingSearch] API request failed:', response.status, response.statusText);
      }
      return [];
    }

    const data = await response.json();

    // Handle proxy response format
    if (data.ok && data.results) {
      // Proxy returns results directly
      return data.results.map((item: any) => ({
        id: item.id || item.url,
        name: item.name || item.title || '',
        url: item.url,
        snippet: item.snippet || item.description || '',
        displayUrl: item.displayUrl || item.url,
        datePublished: item.datePublished,
        dateLastCrawled: item.dateLastCrawled,
      }));
    }

    // Fallback: try to parse as Bing response format
    const bingData = data as BingSearchResponse;
    if (bingData.webPages?.value) {
      return bingData.webPages.value;
    }

    return [];
  } catch (error) {
    console.warn('[BingSearch] Search failed:', error);
    return [];
  }
}

/**
 * Format Bing results for research mode
 */
export function formatBingResults(results: BingSearchResult[]): Array<{
  title: string;
  url: string;
  snippet: string;
  domain: string;
}> {
  return results.map(result => {
    try {
      const urlObj = new URL(result.url);
      const domain = urlObj.hostname.replace(/^www\./, '');

      return {
        title: result.name,
        url: result.url,
        snippet: result.snippet,
        domain,
      };
    } catch {
      return {
        title: result.name,
        url: result.url,
        snippet: result.snippet,
        domain: result.displayUrl || '',
      };
    }
  });
}
