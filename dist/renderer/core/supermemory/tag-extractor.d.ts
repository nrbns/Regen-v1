/**
 * Tag extractor for SuperMemory events.
 * Lightweight keyword extraction for local-first tagging.
 */
import type { MemoryEvent } from './event-types';
export declare function extractTagsFromText(text: string, limit?: number): string[];
export declare function extractTagsFromEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): string[];
