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

    const url = new URL('https://api.bing.microsoft.com/v7.0/search');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('count', count.toString());
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('mkt', market);
    url.searchParams.set('responseFilter', 'Webpages');
    url.searchParams.set('textDecorations', 'false');
    url.searchParams.set('textFormat', 'HTML');

    const response = await fetch(url.toString(), {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[BingSearch] API request failed:', response.status, response.statusText);
      return [];
    }

    const data = (await response.json()) as BingSearchResponse;

    if (data.webPages?.value) {
      return data.webPages.value;
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
