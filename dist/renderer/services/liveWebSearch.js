/**
 * Live Web Search Service
 * Provides unified interface for DuckDuckGo and Bing web search
 * Falls back gracefully when APIs are unavailable
 */
import { fetchBingSearch, formatBingResults } from './bingSearch';
import { fetchDuckDuckGoWeb, fetchDuckDuckGoInstant, formatDuckDuckGoResults, } from './duckDuckGoSearch';
/**
 * Perform live web search using available providers
 * Tries Bing first (if API key available), then DuckDuckGo
 */
export async function performLiveWebSearch(query, options) {
    if (!query || query.trim().length < 2) {
        return [];
    }
    const count = options?.count || 10;
    const language = options?.language;
    const preferBing = options?.preferBing !== false; // Default to true
    // Try Bing first if preferred and API key is available
    if (preferBing) {
        try {
            const bingResults = await fetchBingSearch(query, {
                count,
                language,
            });
            if (bingResults.length > 0) {
                const formatted = formatBingResults(bingResults);
                return formatted.map((result, idx) => ({
                    ...result,
                    provider: 'bing',
                    score: 0.9 - idx * 0.05, // Higher scores for Bing results
                }));
            }
        }
        catch (error) {
            console.debug('[LiveWebSearch] Bing search failed, trying DuckDuckGo:', error);
        }
    }
    // Fallback to DuckDuckGo web search
    try {
        const duckResults = await fetchDuckDuckGoWeb(query, {
            count,
            language,
        });
        if (duckResults.length > 0) {
            return duckResults.map((result, idx) => ({
                ...result,
                provider: 'duckduckgo',
                score: 0.8 - idx * 0.05, // Slightly lower scores for DuckDuckGo
            }));
        }
    }
    catch (error) {
        console.debug('[LiveWebSearch] DuckDuckGo web search failed:', error);
    }
    // Final fallback: Try DuckDuckGo Instant Answer API (limited results)
    try {
        const instantResult = await fetchDuckDuckGoInstant(query, language);
        if (instantResult) {
            const formatted = formatDuckDuckGoResults(instantResult);
            const webResults = formatted.filter(f => f.type === 'result' && f.url).slice(0, count);
            return webResults.map((result, idx) => {
                try {
                    const urlObj = new URL(result.url);
                    const domain = urlObj.hostname.replace(/^www\./, '');
                    return {
                        title: result.title,
                        url: result.url,
                        snippet: result.snippet,
                        domain,
                        provider: 'duckduckgo',
                        score: 0.7 - idx * 0.05,
                    };
                }
                catch {
                    return {
                        title: result.title,
                        url: result.url,
                        snippet: result.snippet,
                        domain: '',
                        provider: 'duckduckgo',
                        score: 0.7 - idx * 0.05,
                    };
                }
            });
        }
    }
    catch (error) {
        console.debug('[LiveWebSearch] DuckDuckGo instant search failed:', error);
    }
    return [];
}
/**
 * Check if live web search is available
 */
export function isLiveWebSearchAvailable() {
    // Bing is available if API key is set
    const bingKey = import.meta.env.VITE_BING_API_KEY || window.__BING_API_KEY;
    const hasBing = bingKey && bingKey !== 'your_bing_api_key_here';
    // DuckDuckGo is always available (no API key needed)
    return hasBing || true; // At least DuckDuckGo is always available
}
