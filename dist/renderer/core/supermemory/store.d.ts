/**
 * SuperMemory Store - Personal long-term memory & personalization layer
 * Uses localStorage with IndexedDB fallback for larger data
 */
import type { MemoryEvent } from './event-types';
export type { MemoryEvent } from './event-types';
declare class MemoryStore {
    private db;
    private useIndexedDB;
    /**
     * Initialize IndexedDB if available
     * Now uses the enhanced database with migrations
     */
    init(): Promise<void>;
    /**
     * Get value from storage
     */
    get<T = any>(key: string): T | null;
    /**
     * Set value in storage
     */
    set(key: string, value: any): void;
    /**
     * Push item to array in storage
     */
    push(key: string, item: any): void;
    /**
     * Save a memory event
     * Uses enhanced database with proper write→embed→store pipeline
     */
    saveEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): Promise<string>;
    /**
     * Get events with optional filters
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
     * Calculate recency + frequency score
     */
    private calculateScore;
    /**
     * Cleanup old events (IndexedDB)
     */
    private cleanupOldEvents;
    /**
     * Cleanup old events (localStorage)
     */
    private cleanupOldEventsSync;
    /**
     * Delete all events
     */
    forgetAll(): Promise<void>;
    /**
     * Export all events (for user export)
     */
    export(): Promise<MemoryEvent[]>;
    /**
     * Get single event by ID
     */
    getEventById(eventId: string): Promise<MemoryEvent | null>;
    /**
     * Get events by ID list (preserves order)
     */
    getEventsByIds(eventIds: string[]): Promise<MemoryEvent[]>;
}
export declare const MemoryStoreInstance: MemoryStore;
export { MemoryStore };
