/**
 * useSuggestions Hook - Get personalized suggestions from SuperMemory
 */

import { useState, useEffect, useMemo } from 'react';
import { MemoryStore, MemoryEvent } from './store';

export interface Suggestion {
  value: string;
  type: MemoryEvent['type'];
  score: number;
  metadata?: MemoryEvent['metadata'];
  count: number; // How many times this appeared
}

/**
 * Hook to get suggestions based on query
 */
export function useSuggestions(query: string, options?: {
  types?: MemoryEvent['type'][];
  limit?: number;
  minScore?: number;
}): Suggestion[] {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const { types = ['search', 'visit', 'bookmark'], limit = 5, minScore = 0.1 } = options || {};

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      const allEvents = await MemoryStore.getEvents({ limit: 1000 });
      if (!cancelled) {
        setEvents(allEvents);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) {
      // Return top suggestions by score when no query
      const grouped = new Map<string, { event: MemoryEvent; count: number }>();
      
      events
        .filter(e => types.includes(e.type))
        .forEach(event => {
          const key = typeof event.value === 'string' ? event.value : JSON.stringify(event.value);
          const existing = grouped.get(key);
          if (existing) {
            existing.count++;
            existing.event.score = (existing.event.score || 0) + (event.score || 0);
          } else {
            grouped.set(key, { event, count: 1 });
          }
        });

      return Array.from(grouped.values())
        .map(({ event, count }) => ({
          value: typeof event.value === 'string' ? event.value : JSON.stringify(event.value),
          type: event.type,
          score: (event.score || 0) / count,
          metadata: event.metadata,
          count,
        }))
        .filter(s => s.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    // Filter by query
    const queryLower = query.toLowerCase();
    const grouped = new Map<string, { event: MemoryEvent; count: number }>();

    events
      .filter(e => {
        if (!types.includes(e.type)) return false;
        const valueStr = typeof e.value === 'string' ? e.value : JSON.stringify(e.value);
        return valueStr.toLowerCase().includes(queryLower);
      })
      .forEach(event => {
        const key = typeof event.value === 'string' ? event.value : JSON.stringify(event.value);
        const existing = grouped.get(key);
        if (existing) {
          existing.count++;
          existing.event.score = (existing.event.score || 0) + (event.score || 0);
        } else {
          grouped.set(key, { event, count: 1 });
        }
      });

    return Array.from(grouped.values())
      .map(({ event, count }) => ({
        value: typeof event.value === 'string' ? event.value : JSON.stringify(event.value),
        type: event.type,
        score: (event.score || 0) / count,
        metadata: event.metadata,
        count,
      }))
      .filter(s => s.score >= minScore)
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.value.toLowerCase() === queryLower;
        const bExact = b.value.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by score
        return b.score - a.score;
      })
      .slice(0, limit);
  }, [query, events, types, limit, minScore]);

  return suggestions;
}

/**
 * Hook to get recent items (no query needed)
 */
export function useRecentItems(options?: {
  types?: MemoryEvent['type'][];
  limit?: number;
}): Suggestion[] {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const { types = ['visit', 'search', 'bookmark'], limit = 10 } = options || {};

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      const recentEvents = await MemoryStore.getEvents({ 
        limit: limit * 2, // Get more to filter
      });
      if (!cancelled) {
        setEvents(recentEvents);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return useMemo(() => {
    return events
      .filter(e => types.includes(e.type))
      .slice(0, limit)
      .map(event => ({
        value: typeof event.value === 'string' ? event.value : JSON.stringify(event.value),
        type: event.type,
        score: event.score || 0,
        metadata: event.metadata,
        count: 1,
      }));
  }, [events, types, limit]);
}

