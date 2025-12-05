/**
 * SuperMemory Pipeline - Write → Embed → Store
 * Orchestrates the complete flow of saving events and generating embeddings
 */
import { MemoryEvent } from './tracker';
export interface PipelineResult {
    eventId: string;
    embeddingIds: string[];
    success: boolean;
    error?: string;
}
/**
 * Complete pipeline: Save event → Generate embeddings → Store vectors
 */
export declare function processMemoryEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): Promise<PipelineResult>;
/**
 * Batch process multiple events
 */
export declare function batchProcessEvents(events: Array<Omit<MemoryEvent, 'id' | 'ts' | 'score'>>): Promise<PipelineResult[]>;
/**
 * Re-embed existing events (useful for migration or when embedding model changes)
 */
export declare function reembedEvents(eventIds?: string[], filters?: {
    type?: MemoryEvent['type'];
    since?: number;
}): Promise<{
    processed: number;
    errors: number;
}>;
/**
 * Cleanup pipeline: Remove old events and their embeddings
 */
export declare function cleanupOldData(daysToKeep?: number): Promise<void>;
/**
 * Get pipeline statistics
 */
export declare function getPipelineStats(): Promise<{
    eventCount: number;
    embeddingCount: number;
    totalSize: number;
    avgEmbeddingsPerEvent: number;
}>;
