/**
 * SuperMemory Database - IndexedDB implementation with migrations
 * Handles events, embeddings, and vector storage
 */
import type { MemoryEvent } from './event-types';
export type { MemoryEvent } from './event-types';
export interface EmbeddingRecord {
    id: string;
    eventId: string;
    vector: number[];
    text: string;
    metadata?: Record<string, any>;
    timestamp: number;
}
declare class SuperMemoryDB {
    private db;
    private initPromise;
    /**
     * Initialize database with migrations
     */
    init(): Promise<void>;
    /**
     * Get database instance (ensure initialized)
     */
    private getDB;
    /**
     * Save event to database
     */
    saveEvent(event: MemoryEvent): Promise<void>;
    /**
     * Update event metadata (pin, tags, etc.)
     */
    updateEventMetadata(eventId: string, updates: Partial<MemoryEvent['metadata']>): Promise<void>;
    /**
     * Get all unique tags
     */
    getAllTags(): Promise<string[]>;
    /**
     * Get events with filters
     */
    getEvents(filters?: {
        type?: MemoryEvent['type'];
        limit?: number;
        since?: number;
        until?: number;
        pinned?: boolean;
        tags?: string[];
    }): Promise<MemoryEvent[]>;
    /**
     * Save embedding to database
     */
    saveEmbedding(embedding: EmbeddingRecord): Promise<void>;
    /**
     * Get embeddings for an event
     */
    getEmbeddingsForEvent(eventId: string): Promise<EmbeddingRecord[]>;
    /**
     * Get all embeddings (for vector search)
     * Note: In production, use a proper vector database for efficient similarity search
     */
    getAllEmbeddings(limit?: number): Promise<EmbeddingRecord[]>;
    /**
     * Delete embeddings for an event
     */
    deleteEmbeddingsForEvent(eventId: string): Promise<void>;
    /**
     * Get a single embedding by ID
     */
    getEmbedding(id: string): Promise<EmbeddingRecord | null>;
    /**
     * Delete a single embedding by ID
     */
    deleteEmbedding(id: string): Promise<void>;
    /**
     * Delete embeddings by event ID (alias for deleteEmbeddingsForEvent)
     */
    deleteEmbeddingsByEventId(eventId: string): Promise<void>;
    /**
     * Get total embedding count
     */
    getEmbeddingCount(): Promise<number>;
    /**
     * Clear all embeddings
     */
    clearEmbeddings(): Promise<void>;
    /**
     * Delete event and its embeddings
     */
    deleteEvent(eventId: string): Promise<void>;
    /**
     * Cleanup old events and embeddings
     */
    cleanupOldData(daysToKeep?: number): Promise<void>;
    /**
     * Get database statistics
     */
    getStats(): Promise<{
        eventCount: number;
        embeddingCount: number;
        totalSize: number;
    }>;
    /**
     * Clear all data
     */
    clearAll(): Promise<void>;
    /**
     * Get a single event by ID
     */
    getEvent(eventId: string): Promise<MemoryEvent | null>;
    /**
     * Get multiple events by IDs (preserves order of IDs)
     */
    getEventsByIds(ids: string[]): Promise<MemoryEvent[]>;
}
export declare const superMemoryDB: SuperMemoryDB;
