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
export declare function scrapeResearchSources(urls: string[], _options?: Omit<ScrapeSourcePayload, 'urls'>): Promise<ScrapedSourceResult[]>;
