/**
 * useSuggestions Hook - Get personalized suggestions from SuperMemory
 */

import { useState, useEffect } from 'react';
// import { MemoryStore } from './store'; // Unused for now
import { MemoryEvent } from './tracker';
import { useDebounce } from '../../utils/useDebounce';
import { searchEmbeddings } from './embedding';

interface Suggestion {
  value: string;
  type: string;
  count: number;
  lastUsed: number;
  metadata?: any;
}

interface UseSuggestionsOptions {
  types?: Array<MemoryEvent['type']>;
  limit?: number;
  minQueryLength?: number;
}

export function useSuggestions(query: string, options?: UseSuggestionsOptions): Suggestion[] {
  const { types = ['search', 'visit'], limit = 5, minQueryLength = 2 } = options || {};
  const debouncedQuery = useDebounce(query, 200);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      // Try semantic search first (if embeddings available)
      try {
        const semanticResults = await searchEmbeddings(debouncedQuery, limit);
        if (semanticResults.length > 0 && semanticResults[0].similarity > 0.3) {
          // Use semantic results if similarity is good
          const suggestions = semanticResults.map(result => ({
            value: result.embedding.text,
            type: result.embedding.metadata?.eventType || 'search',
            count: 1,
            lastUsed: result.embedding.timestamp,
            metadata: result.embedding.metadata,
          }));
          if (!cancelled) setSuggestions(suggestions);
          return;
        }
      } catch (error) {
        // Fall back to keyword search if semantic search fails
        console.debug('[SuperMemory] Semantic search failed, using keyword search:', error);
      }

      // Fallback to keyword-based search
      const { MemoryStoreInstance } = await import('./store');
      const allEvents = await MemoryStoreInstance.getEvents({ limit: 1000 });
      if (cancelled) return;

      const queryLower = debouncedQuery.toLowerCase();

      const scoredSuggestions = new Map<string, { event: MemoryEvent; count: number; lastUsed: number }>();

      for (const event of allEvents) {
        if (types.includes(event.type)) {
          let matchValue = '';
          if (event.type === 'search' && event.value) {
            matchValue = event.value;
          } else if (event.type === 'visit' && event.metadata?.title) {
            matchValue = event.metadata.title;
          } else if (event.type === 'visit' && event.value) {
            matchValue = event.value; // URL
          }

          if (matchValue && matchValue.toLowerCase().includes(queryLower)) {
            const key = `${event.type}-${matchValue}`;
            if (!scoredSuggestions.has(key)) {
              scoredSuggestions.set(key, { event, count: 0, lastUsed: 0 });
            }
            const entry = scoredSuggestions.get(key)!;
            entry.count++;
            if (event.ts > entry.lastUsed) {
              entry.lastUsed = event.ts;
            }
          }
        }
      }

      const sorted = Array.from(scoredSuggestions.values())
        .map(entry => ({
          value: entry.event.value,
          type: entry.event.type,
          count: entry.count,
          lastUsed: entry.lastUsed,
          metadata: entry.event.metadata,
        }))
        .sort((a, b) => {
          // Prioritize by query match quality (exact match, starts with, includes)
          const aValueLower = a.value.toLowerCase();
          const bValueLower = b.value.toLowerCase();

          const aExact = aValueLower === queryLower;
          const bExact = bValueLower === queryLower;
          if (aExact !== bExact) return aExact ? -1 : 1;

          const aStartsWith = aValueLower.startsWith(queryLower);
          const bStartsWith = bValueLower.startsWith(queryLower);
          if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1;

          // Then by recency (more recent first)
          if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;

          // Then by frequency (more frequent first)
          return b.count - a.count;
        })
        .slice(0, limit);

      if (!cancelled) setSuggestions(sorted);
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, types, limit, minQueryLength]);

  return suggestions;
}
