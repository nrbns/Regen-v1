import type { MemoryEvent } from './event-types';
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
export declare function semanticSearchMemories(query: string, options?: SemanticSearchOptions): Promise<SemanticMemoryMatch[]>;
