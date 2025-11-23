const API_BASE =
  (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '') ||
  import.meta.env.VITE_APP_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

export interface ScrapeSourcePayload {
  urls: string[];
  allow_render?: boolean;
  use_cache?: boolean;
  selectors?: string[];
  max_chars?: number;
}

export interface ScrapedSourceResult {
  url: string;
  finalUrl?: string;
  status?: number;
  title?: string;
  description?: string;
  image?: string;
  excerpt?: string;
  content?: string;
  wordCount?: number;
  lang?: string;
  contentHash?: string;
  rendered?: boolean;
  fromCache?: boolean;
  fetchedAt?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

interface BackendScrapeResponse {
  results: Array<{
    url: string;
    final_url?: string;
    status?: number;
    title?: string;
    description?: string;
    image?: string;
    excerpt?: string;
    content?: string;
    word_count?: number;
    lang?: string;
    content_hash?: string;
    rendered?: boolean;
    from_cache?: boolean;
    fetched_at?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export async function scrapeResearchSources(
  urls: string[],
  options: Omit<ScrapeSourcePayload, 'urls'> = {}
): Promise<ScrapedSourceResult[]> {
  if (!API_BASE || urls.length === 0) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE.replace(/\/$/, '')}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls,
        allow_render: options.allow_render ?? true,
        use_cache: options.use_cache ?? true,
        selectors: options.selectors,
        max_chars: options.max_chars ?? 12000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.warn('[Scraper] Backend returned error', response.status, errorText);
      return [];
    }

    const payload = (await response.json()) as BackendScrapeResponse;
    return (payload.results ?? []).map(result => ({
      url: result.url,
      finalUrl: result.final_url,
      status: result.status,
      title: result.title,
      description: result.description,
      image: result.image,
      excerpt: result.excerpt,
      content: result.content,
      wordCount: result.word_count,
      lang: result.lang,
      contentHash: result.content_hash,
      rendered: result.rendered,
      fromCache: result.from_cache,
      fetchedAt: result.fetched_at,
      metadata: result.metadata,
    }));
  } catch (error) {
    console.warn('[Scraper] Failed to fetch sources', error);
    return [];
  }
}
