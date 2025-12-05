/**
 * Embedding Pipeline for SuperMemory
 * Generates and stores vector embeddings for semantic search
 */
import { MemoryEvent } from './tracker';
export interface Embedding {
    id: string;
    eventId: string;
    vector: number[];
    text: string;
    metadata?: Record<string, any>;
    timestamp: number;
}
/**
 * Split text into chunks for embedding
 */
export declare function chunkText(text: string, chunkSize?: number, overlap?: number): string[];
/**
 * Generate embedding for text using Hugging Face API (with fallback)
 * Uses Hugging Face Inference API for semantic embeddings
 */
export declare function generateEmbedding(text: string): Promise<number[]>;
/**
 * Generate and store embeddings for a memory event
 */
export declare function embedMemoryEvent(event: MemoryEvent): Promise<string[]>;
/**
 * Search embeddings by similarity
 */
export declare function searchEmbeddings(query: string, limit?: number): Promise<Array<{
    embedding: Embedding;
    similarity: number;
}>>;
/**
 * Batch embed multiple events
 */
export declare function batchEmbedEvents(events: MemoryEvent[]): Promise<void>;
/**
 * Clear embeddings for an event
 */
export declare function clearEventEmbeddings(eventId: string): Promise<void>;
