import type { MemoryEvent } from './event-types';
import { MemoryStoreInstance } from './store';
import { searchVectors, VectorSearchResult } from './vectorStore';

export interface SemanticMemoryMatch {
  event: MemoryEvent;
  similarity: number;
  embeddingId: string;
  chunkText?: string;
}

export interface SemanticSearchOptions {
  limit?: number;
  minSimilarity?: number;
}

export async function semanticSearchMemories(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticMemoryMatch[]> {
  const { limit = 12, minSimilarity = 0.55 } = options;
  const vectorResults = await searchVectors(query, {
    maxVectors: limit * 4,
    minSimilarity,
  });

  if (vectorResults.length === 0) {
    return [];
  }

  const events = await hydrateEvents(vectorResults, limit);
  return events;
}

async function hydrateEvents(
  vectorResults: VectorSearchResult[],
  limit: number
): Promise<SemanticMemoryMatch[]> {
  const uniqueEventIds: string[] = [];
  const seen = new Set<string>();
  for (const result of vectorResults) {
    if (!seen.has(result.embedding.eventId)) {
      uniqueEventIds.push(result.embedding.eventId);
      seen.add(result.embedding.eventId);
      if (uniqueEventIds.length >= limit) {
        break;
      }
    }
  }

  const events = await MemoryStoreInstance.getEventsByIds(uniqueEventIds);
  const eventMap = new Map(events.map(event => [event.id, event]));

  const matches: SemanticMemoryMatch[] = [];
  for (const result of vectorResults) {
    if (matches.length >= limit) break;
    const event = eventMap.get(result.embedding.eventId);
    if (!event) continue;
    matches.push({
      event,
      similarity: result.similarity,
      embeddingId: result.embedding.id,
      chunkText: result.embedding.text,
    });
  }

  return matches;
}


