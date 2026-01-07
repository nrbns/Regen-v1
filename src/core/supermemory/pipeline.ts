/**
 * SuperMemory Pipeline - Write → Embed → Store
 * Orchestrates the complete flow of saving events and generating embeddings
 */

import { MemoryEvent } from './tracker';
import { MemoryStoreInstance } from './store';
import { embedMemoryEvent } from './embedding';
import { superMemoryDB } from './db';
import { extractTagsFromEvent } from './tag-extractor';

export interface PipelineResult {
  eventId: string;
  embeddingIds: string[];
  success: boolean;
  error?: string;
}

/**
 * Complete pipeline: Save event → Generate embeddings → Store vectors
 */
export async function processMemoryEvent(
  event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>
): Promise<PipelineResult> {
  try {
    const enrichedEvent = applyAutoTags(event);

    // Step 1: Save event to database
    const eventId = await MemoryStoreInstance.saveEvent(enrichedEvent);
    
    // Step 2: Retrieve stored event for embedding (ensures ts/score match)
    const fullEvent =
      (await MemoryStoreInstance.getEventById(eventId)) ??
      ({
        ...enrichedEvent,
        id: eventId,
        ts: Date.now(),
        score: 0,
      } as MemoryEvent);
    
    // Step 3: Generate and store embeddings
    let embeddingIds: string[] = [];
    try {
      embeddingIds = await embedMemoryEvent(fullEvent);
    } catch (embedError) {
      console.warn('[Pipeline] Failed to generate embeddings, continuing without them:', embedError);
      // Continue even if embedding fails - event is still saved
    }
    
    return {
      eventId,
      embeddingIds,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Pipeline] Failed to process memory event:', error);
    
    return {
      eventId: '',
      embeddingIds: [],
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Batch process multiple events
 */
export async function batchProcessEvents(
  events: Array<Omit<MemoryEvent, 'id' | 'ts' | 'score'>>
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];
  
  // Process in parallel (with concurrency limit to avoid overwhelming the system)
  const CONCURRENCY = 5;
  for (let i = 0; i < events.length; i += CONCURRENCY) {
    const batch = events.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(event => processMemoryEvent(event))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Re-embed existing events (useful for migration or when embedding model changes)
 */
export async function reembedEvents(
  eventIds?: string[],
  filters?: { type?: MemoryEvent['type']; since?: number }
): Promise<{ processed: number; errors: number }> {
  try {
    // Get events to re-embed
    const events = await MemoryStoreInstance.getEvents(filters);
    const eventsToProcess = eventIds
      ? events.filter((e: MemoryEvent) => eventIds.includes(e.id))
      : events;
    
    let processed = 0;
    let errors = 0;
    
    // Delete old embeddings and regenerate
    for (const event of eventsToProcess) {
      try {
        // Delete old embeddings
        await superMemoryDB.deleteEmbeddingsForEvent(event.id);
        
        // Generate new embeddings
        await embedMemoryEvent(event);
        processed++;
      } catch (error) {
        console.warn(`[Pipeline] Failed to re-embed event ${event.id}:`, error);
        errors++;
      }
    }
    
    return { processed, errors };
  } catch (error) {
    console.error('[Pipeline] Failed to re-embed events:', error);
    return { processed: 0, errors: 1 };
  }
}

/**
 * Cleanup pipeline: Remove old events and their embeddings
 */
export async function cleanupOldData(daysToKeep: number = 90): Promise<void> {
  try {
    await superMemoryDB.cleanupOldData(daysToKeep);
  } catch (error) {
    console.error('[Pipeline] Failed to cleanup old data:', error);
  }
}

function applyAutoTags(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): Omit<MemoryEvent, 'id' | 'ts' | 'score'> {
  const tags = extractTagsFromEvent(event);
  if (tags.length === 0) {
    return event;
  }

  const existing = Array.isArray(event.metadata?.tags) ? event.metadata!.tags : [];
  const mergedTags = Array.from(new Set([...existing, ...tags])).slice(0, 10);

  return {
    ...event,
    metadata: {
      ...(event.metadata || {}),
      tags: mergedTags,
    },
  };
}

/**
 * Get pipeline statistics
 */
export async function getPipelineStats(): Promise<{
  eventCount: number;
  embeddingCount: number;
  totalSize: number;
  avgEmbeddingsPerEvent: number;
}> {
  try {
    const stats = await superMemoryDB.getStats();
    const events = await MemoryStoreInstance.getEvents({ limit: 100 });
    
    // Calculate average embeddings per event
    let totalEmbeddings = 0;
    for (const event of events) {
      const embeddings = await superMemoryDB.getEmbeddingsForEvent(event.id);
      totalEmbeddings += embeddings.length;
    }
    const avgEmbeddingsPerEvent = events.length > 0
      ? totalEmbeddings / events.length
      : 0;
    
    return {
      ...stats,
      avgEmbeddingsPerEvent,
    };
  } catch (error) {
    console.error('[Pipeline] Failed to get stats:', error);
    return {
      eventCount: 0,
      embeddingCount: 0,
      totalSize: 0,
      avgEmbeddingsPerEvent: 0,
    };
  }
}

