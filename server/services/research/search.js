/* eslint-env node */

import { runSearch } from '../../redix-search.js';
import { detectLanguage } from '../lang/detect.js';

function mapItem(item, index) {
  return {
    id: item.id || `duck-${index}`,
    title: item.title || item.url || 'Untitled result',
    snippet: item.snippet || '',
    url: item.url || null,
    source_type: item.source || 'web',
    score: item.score ?? Math.max(0.1, 1 - index * 0.05),
    fetched_at: item.fetched_at || new Date().toISOString(),
  };
}

export async function researchSearch({
  query,
  size = 10,
  sourceFilters = [],
  sort = 'relevance',
  language,
}) {
  if (!query || !query.trim()) {
    throw new Error('Query is required');
  }

  const detection = detectLanguage(query, language);
  const started = Date.now();
  const rawItems = await runSearch(query.trim(), detection.language);
  let items = rawItems.map(mapItem);

  if (Array.isArray(sourceFilters) && sourceFilters.length > 0) {
    items = items.filter(item => sourceFilters.includes(item.source_type));
  }

  if (sort === 'freshness') {
    items = items.sort(
      (a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime()
    );
  }

  const limited = items.slice(0, Math.min(size, 50));
  return {
    query_id: `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    results: limited,
    total: items.length,
    latency_ms: Date.now() - started,
    detected_language: detection,
  };
}
