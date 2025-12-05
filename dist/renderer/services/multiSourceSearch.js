import { ipc } from '../lib/ipc-typed';
const DEFAULT_RESULT_SCORE = 0.62;
export async function multiSourceSearch(query, options) {
    if (!query || !query.trim()) {
        return [];
    }
    try {
        // Pass language to backend if available
        const response = await ipc.hybridSearch.search(query, options?.limit, options?.language);
        const rawResults = normalizeHybridResults(response);
        return rawResults.map(item => {
            const domain = item.domain || deriveDomain(item.url);
            const score = typeof item.score === 'number'
                ? item.score
                : typeof item.relevance_score === 'number'
                    ? item.relevance_score
                    : DEFAULT_RESULT_SCORE;
            return {
                title: item.title || item.url || 'Untitled result',
                url: item.url ?? '',
                snippet: item.snippet ?? '',
                source: (item.source || item.metadata?.provider || 'web'),
                score,
                domain,
                metadata: item.metadata ?? {},
            };
        });
    }
    catch (error) {
        console.warn('[MultiSourceSearch] Failed to fetch hybrid results:', error);
        return [];
    }
}
function normalizeHybridResults(payload) {
    if (!payload) {
        return [];
    }
    if (Array.isArray(payload)) {
        return payload.filter(isHybridResult);
    }
    if (typeof payload === 'object') {
        const candidates = payload.results;
        if (Array.isArray(candidates)) {
            return candidates.filter(isHybridResult);
        }
    }
    return [];
}
function isHybridResult(entry) {
    return typeof entry === 'object' && entry !== null;
}
function deriveDomain(url) {
    if (!url)
        return '';
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    }
    catch {
        return '';
    }
}
