// DuckDuckGo Instant Answer API client
// No API key required - public endpoint
// Also supports HTML scraping for full web results
const LANGUAGE_LOCALE_MAP = {
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
function getDuckLocale(lang) {
    if (!lang || lang === 'auto')
        return 'us-en';
    return LANGUAGE_LOCALE_MAP[lang] || 'us-en';
}
export async function fetchDuckDuckGoInstant(query, language) {
    if (!query || query.trim().length < 1)
        return null;
    const normalizedQuery = query.trim();
    // OPTIMIZATION: Normalize query - remove extra spaces, handle special characters
    const cleanQuery = normalizedQuery
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\-.,!?]/g, '')
        .trim();
    if (cleanQuery.length < 1)
        return null;
    try {
        // Try Tauri search_proxy first (bypasses CORS and activates DuckDuckGo)
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const result = await invoke('search_proxy', { query: cleanQuery });
                if (result && typeof result === 'object') {
                    console.debug('[DuckDuckGo] Using Tauri search_proxy (activated)');
                    return result;
                }
            }
            catch (tauriError) {
                // Fall through to direct fetch
                if (import.meta.env.DEV) {
                    console.debug('[DuckDuckGo] Tauri search_proxy failed, using direct fetch:', tauriError);
                }
            }
        }
        // Fallback: Direct fetch to DuckDuckGo API with retry logic
        const locale = getDuckLocale(language);
        const langCode = locale.split('-')[0];
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_redirect=1&skip_disambig=1&kl=${locale}&hl=${langCode}`;
        // OPTIMIZATION: Add timeout and retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                console.warn('[DuckDuckGo] API request failed:', res.status);
                // Retry once with a simpler query if it's a long query
                if (cleanQuery.length > 50 && res.status === 429) {
                    const shortQuery = cleanQuery.split(' ').slice(0, 5).join(' ');
                    return fetchDuckDuckGoInstant(shortQuery, language);
                }
                return null;
            }
            const data = (await res.json());
            // OPTIMIZATION: Validate response has useful data
            if (data && (data.AbstractText || data.Answer || data.Definition || (data.Results && data.Results.length > 0))) {
                return data;
            }
            // If no useful data, return null to trigger fallback
            return null;
        }
        catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.warn('[DuckDuckGo] Request timeout');
            }
            else {
                console.warn('[DuckDuckGo] Fetch failed:', fetchError);
            }
            return null;
        }
    }
    catch (error) {
        console.warn('[DuckDuckGo] Search failed:', error);
        return null;
    }
}
export function formatDuckDuckGoResults(result) {
    if (!result)
        return [];
    const formatted = [];
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
export async function fetchDuckDuckGoWeb(query, options) {
    if (!query || query.trim().length < 2) {
        return [];
    }
    try {
        const count = options?.count || 10;
        const locale = getDuckLocale(options?.language);
        const langCode = locale.split('-')[0];
        // Use DuckDuckGo HTML search page
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.trim())}&kl=${locale}&hl=${langCode}`;
        // Try to use Tauri search_proxy if available, otherwise direct fetch
        let html;
        try {
            // Check if we're in Tauri and can use search_proxy command
            if (typeof window !== 'undefined' && window.__TAURI__) {
                try {
                    // Use Tauri invoke to call search_proxy (bypasses CORS)
                    // Note: search_proxy returns JSON, not HTML, so we'll use the instant API instead
                    // For HTML scraping, we need a different approach
                    const instantResult = await fetchDuckDuckGoInstant(query, options?.language);
                    if (instantResult) {
                        // Convert instant results to web results format
                        const formatted = formatDuckDuckGoResults(instantResult);
                        return formatted.map(f => ({
                            title: f.title,
                            url: f.url || '',
                            snippet: f.snippet,
                            domain: f.url ? new URL(f.url).hostname.replace(/^www\./, '') : '',
                        }));
                    }
                }
                catch (tauriError) {
                    console.debug('[DuckDuckGo] Tauri search_proxy failed, trying direct fetch:', tauriError);
                }
            }
            // Fallback: Direct fetch (may fail due to CORS in browser)
            const response = await fetch(searchUrl, {
                headers: {
                    Accept: 'text/html',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                mode: 'cors',
            });
            if (!response.ok) {
                console.warn('[DuckDuckGo] Web search failed:', response.status);
                // Fallback to instant API
                const instantResult = await fetchDuckDuckGoInstant(query, options?.language);
                if (instantResult) {
                    const formatted = formatDuckDuckGoResults(instantResult);
                    return formatted.map(f => ({
                        title: f.title,
                        url: f.url || '',
                        snippet: f.snippet,
                        domain: f.url ? new URL(f.url).hostname.replace(/^www\./, '') : '',
                    }));
                }
                return [];
            }
            html = await response.text();
        }
        catch (fetchError) {
            // CORS or network error - try instant API as fallback
            console.debug('[DuckDuckGo] Web search blocked (CORS or network), trying instant API:', fetchError);
            try {
                const instantResult = await fetchDuckDuckGoInstant(query, options?.language);
                if (instantResult) {
                    const formatted = formatDuckDuckGoResults(instantResult);
                    return formatted.map(f => ({
                        title: f.title,
                        url: f.url || '',
                        snippet: f.snippet,
                        domain: f.url ? new URL(f.url).hostname.replace(/^www\./, '') : '',
                    }));
                }
            }
            catch {
                // Both failed
            }
            return [];
        }
        const results = [];
        // Parse HTML results - DuckDuckGo HTML structure
        // Modern structure uses data-testid or class-based selectors
        const linkRegex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        const links = [];
        const snippets = [];
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
                }
                else if (!fullUrl.startsWith('http')) {
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
            }
            catch {
                // Skip invalid URLs
            }
        }
        return results;
    }
    catch (error) {
        console.warn('[DuckDuckGo] Web search failed:', error);
        return [];
    }
}
