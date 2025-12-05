/**
 * Memory Summarizer
 * Automatically compresses and summarizes memory events
 * Runs nightly to create summaries of old events
 */
import { MemoryEvent } from './store';
export interface MemorySummary {
    id: string;
    type: 'daily' | 'weekly' | 'monthly';
    periodStart: number;
    periodEnd: number;
    summary: string;
    eventCount: number;
    eventIds: string[];
    tags: string[];
    createdAt: number;
}
/**
 * Compress events by creating a summary and removing old events
 */
export declare function compressEvents(events: MemoryEvent[], summaryType?: 'daily' | 'weekly' | 'monthly'): Promise<MemorySummary>;
/**
 * Get all summaries
 */
export declare function getSummaries(limit?: number): Promise<MemorySummary[]>;
/**
 * Run nightly summarization
 * Should be called once per day
 */
export declare function runNightlySummarization(): Promise<{
    success: boolean;
    summariesCreated: number;
    eventsCompressed: number;
}>;
/**
 * Initialize nightly summarization scheduler
 * Runs automatically once per day, or can be triggered manually
 */
export declare function initNightlySummarization(): void;
/**
 * Manually trigger summarization (for testing or user-initiated compression)
 */
export declare function triggerSummarization(): Promise<{
    success: boolean;
    summariesCreated: number;
    eventsCompressed: number;
}>;
