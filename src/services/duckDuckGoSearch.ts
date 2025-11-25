// DuckDuckGo Instant Answer API client
// No API key required - public endpoint
// Also supports HTML scraping for full web results

export type DuckDuckGoResult = {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  RelatedTopics?: Array<{
    FirstURL?: string;
    Text?: string;
    Name?: string;
  }>;
  Results?: Array<{
    FirstURL: string;
    Text: string;
  }>;
  Answer?: string;
  AnswerType?: string;
  Definition?: string;
  DefinitionURL?: string;
  DefinitionSource?: string;
  Image?: string;
  ImageIsLogo?: number;
  Infobox?: any;
  Redirect?: string;
};

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  hi: 'in-hi',
  ta: 'in-ta',
  te: 'in-te',
  bn: 'in-bn',
  mr: 'in-mr',
  kn: 'in-kn',
  ml: 'in-ml',
  gu: 'in-gu',
  pa: 'in-pa',
  ur: 'pk-ur',
  en: 'us-en',
  es: 'es-es',
  fr: 'fr-fr',
  de: 'de-de',
  pt: 'pt-pt',
  zh: 'cn-zh',
  ja: 'jp-ja',
  ru: 'ru-ru',
};

function getDuckLocale(lang?: string): string {
  if (!lang || lang === 'auto') return 'us-en';
  return LANGUAGE_LOCALE_MAP[lang] || 'us-en';
}

export async function fetchDuckDuckGoInstant(
  query: string,
  language?: string
): Promise<DuckDuckGoResult | null> {
  if (!query || query.trim().length < 2) return null;

  try {
    const locale = getDuckLocale(language);
    const langCode = locale.split('-')[0];
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query.trim())}&format=json&no_redirect=1&skip_disambig=1&kl=${locale}&hl=${langCode}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as DuckDuckGoResult;
    return data;
  } catch (error) {
    console.warn('[DuckDuckGo] Search failed:', error);
    return null;
  }
}

export function formatDuckDuckGoResults(result: DuckDuckGoResult | null): Array<{
  title: string;
  url?: string;
  snippet: string;
  type: 'instant' | 'result' | 'related';
}> {
  if (!result) return [];

  const formatted: Array<{
    title: string;
    url?: string;
    snippet: string;
    type: 'instant' | 'result' | 'related';
  }> = [];

  // Instant Answer
  if (result.Heading && result.AbstractText) {
    formatted.push({
      title: result.Heading,
      url: result.AbstractURL,
      snippet: result.AbstractText,
      type: 'instant',
    });
  }

  // Answer box
  if (result.Answer) {
    formatted.push({
      title: result.AnswerType || 'Answer',
      snippet: result.Answer,
      type: 'instant',
    });
  }

  // Definition
  if (result.Definition) {
    formatted.push({
      title: result.DefinitionSource || 'Definition',
      url: result.DefinitionURL,
      snippet: result.Definition,
      type: 'instant',
    });
  }

  // Web Results - Extract more results from Instant Answer API
  if (result.Results && result.Results.length > 0) {
    result.Results.slice(0, 10).forEach(r => {
      formatted.push({
        title: r.Text || r.FirstURL,
        url: r.FirstURL,
        snippet: r.Text || '',
        type: 'result',
      });
    });
  }

  // Related Topics
  if (result.RelatedTopics && result.RelatedTopics.length > 0) {
    result.RelatedTopics.slice(0, 5).forEach(rt => {
      formatted.push({
        title: rt.Text || rt.Name || 'Related',
        url: rt.FirstURL,
        snippet: '',
        type: 'related',
      });
    });
  }

  return formatted;
}

/**
 * Fetch full web search results from DuckDuckGo HTML
 * This scrapes the HTML search page since DuckDuckGo doesn't have a public web search API
 * Note: May require CORS proxy in browser environments
 */
export async function fetchDuckDuckGoWeb(
  query: string,
  options?: {
    count?: number;
    language?: string;
  }
): Promise<
  Array<{
    title: string;
    url: string;
    snippet: string;
    domain: string;
  }>
> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const count = options?.count || 10;
    const locale = getDuckLocale(options?.language);
    const langCode = locale.split('-')[0];

    // Use DuckDuckGo HTML search page
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.trim())}&kl=${locale}&hl=${langCode}`;

    // Try to use IPC proxy if available (Electron/Tauri), otherwise direct fetch
    let html: string;
    try {
      // Check if we're in Electron/Tauri and can use IPC proxy
      if (typeof window !== 'undefined' && (window as any).ipc) {
        // Use IPC to fetch (bypasses CORS)
        const response = await (window as any).ipc.fetch?.(searchUrl, {
          headers: {
            Accept: 'text/html',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        html = response?.text || '';
      } else {
        // Direct fetch (may fail due to CORS in browser)
        const response = await fetch(searchUrl, {
          headers: {
            Accept: 'text/html',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          mode: 'cors',
        });

        if (!response.ok) {
          console.warn('[DuckDuckGo] Web search failed:', response.status);
          return [];
        }

        html = await response.text();
      }
    } catch (fetchError) {
      // CORS or network error - return empty results
      console.debug('[DuckDuckGo] Web search blocked (CORS or network):', fetchError);
      return [];
    }

    const results: Array<{ title: string; url: string; snippet: string; domain: string }> = [];

    // Parse HTML results - DuckDuckGo HTML structure
    // Modern structure uses data-testid or class-based selectors
    const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const linkRegex =
      /<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    const links: Array<{ url: string; title: string }> = [];
    const snippets: string[] = [];

    // Extract links
    while ((match = linkRegex.exec(html)) !== null && links.length < count) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (url && title) {
        links.push({ url, title });
      }
    }

    // Extract snippets
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < count) {
      const snippet = match[1].replace(/<[^>]*>/g, '').trim();
      if (snippet) {
        snippets.push(snippet);
      }
    }

    // Combine links and snippets
    for (let i = 0; i < Math.min(links.length, count); i++) {
      try {
        // DuckDuckGo returns relative URLs that need to be resolved
        let fullUrl = links[i].url;
        if (fullUrl.startsWith('/l/?kh=')) {
          // DuckDuckGo redirect URL - extract actual URL
          const urlMatch = fullUrl.match(/uddg=([^&]+)/);
          if (urlMatch) {
            fullUrl = decodeURIComponent(urlMatch[1]);
          }
        } else if (!fullUrl.startsWith('http')) {
          // Relative URL
          fullUrl = `https://${fullUrl}`;
        }

        const urlObj = new URL(fullUrl);
        const domain = urlObj.hostname.replace(/^www\./, '');

        results.push({
          title: links[i].title,
          url: fullUrl,
          snippet: snippets[i] || '',
          domain,
        });
      } catch {
        // Skip invalid URLs
      }
    }

    return results;
  } catch (error) {
    console.warn('[DuckDuckGo] Web search failed:', error);
    return [];
  }
}
