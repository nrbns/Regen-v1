import { ipc } from '../lib/ipc-typed';

export type MultiSourceProvider = 'brave' | 'bing' | 'duckduckgo' | 'custom' | string;

export interface MultiSourceSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: MultiSourceProvider;
  score: number;
  domain: string;
  metadata?: Record<string, unknown>;
}

export interface MultiSourceSearchOptions {
  limit?: number;
}

type HybridSearchItem = {
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
  domain?: string;
  score?: number;
  relevance_score?: number;
  metadata?: Record<string, unknown> & { provider?: string };
};

const DEFAULT_RESULT_SCORE = 0.62;

export async function multiSourceSearch(
  query: string,
  options?: MultiSourceSearchOptions
): Promise<MultiSourceSearchResult[]> {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const response = await ipc.hybridSearch.search(query, options?.limit);
    const rawResults = normalizeHybridResults(response);

    return rawResults.map(item => {
      const domain = item.domain || deriveDomain(item.url);
      const score =
        typeof item.score === 'number'
          ? item.score
          : typeof item.relevance_score === 'number'
            ? item.relevance_score
            : DEFAULT_RESULT_SCORE;

      return {
        title: item.title || item.url || 'Untitled result',
        url: item.url ?? '',
        snippet: item.snippet ?? '',
        source: (item.source || item.metadata?.provider || 'web') as MultiSourceProvider,
        score,
        domain,
        metadata: item.metadata ?? {},
      };
    });
  } catch (error) {
    console.warn('[MultiSourceSearch] Failed to fetch hybrid results:', error);
    return [];
  }
}

function normalizeHybridResults(payload: unknown): HybridSearchItem[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.filter(isHybridResult);
  }

  if (typeof payload === 'object') {
    const candidates = (payload as { results?: unknown }).results;
    if (Array.isArray(candidates)) {
      return candidates.filter(isHybridResult);
    }
  }

  return [];
}

function isHybridResult(entry: unknown): entry is HybridSearchItem {
  return typeof entry === 'object' && entry !== null;
}

function deriveDomain(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
