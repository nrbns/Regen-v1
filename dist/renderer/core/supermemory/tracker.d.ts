/**
 * SuperMemory Event Tracker
 * Tracks user behavior events for personalization
 */
import type { MemoryEvent, SearchEventMetadata, VisitEventMetadata, HighlightEventMetadata, ScreenshotEventMetadata, NoteEventMetadata } from './event-types';
export type { MemoryEvent, SearchEventMetadata, VisitEventMetadata, HighlightEventMetadata, ScreenshotEventMetadata, NoteEventMetadata } from './event-types';
/**
 * Track a user event
 */
export declare function trackUserEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): Promise<string>;
/**
 * Track a search query
 */
export declare function trackSearch(query: string, metadata?: Partial<SearchEventMetadata>): Promise<string>;
/**
 * Track a page visit
 * Enhanced with duration and interaction tracking
 */
export declare function trackVisit(url: string, title?: string, metadata?: Partial<VisitEventMetadata>): Promise<string>;
/**
 * Track a mode switch
 */
export declare function trackModeSwitch(mode: string): Promise<string>;
/**
 * Track a bookmark
 */
export declare function trackBookmark(url: string, metadata?: {
    title?: string;
}): Promise<string>;
/**
 * Track a note
 * Enhanced with preview and tags
 */
export declare function trackNote(url: string, metadata?: Partial<NoteEventMetadata>): Promise<string>;
/**
 * Track a prefetch action
 */
export declare function trackPrefetch(url: string, metadata?: {
    success?: boolean;
}): Promise<string>;
/**
 * Track a custom action
 */
export declare function trackAction(action: string, metadata?: Record<string, any>): Promise<string>;
/**
 * Track a text highlight
 * Enhanced with position and context tracking
 */
export declare function trackHighlight(url: string, text: string, metadata?: Partial<HighlightEventMetadata>): Promise<string>;
/**
 * Track a screenshot capture
 * Enhanced with size and format tracking
 */
export declare function trackScreenshot(url: string, metadata?: Partial<ScreenshotEventMetadata>): Promise<string>;
/**
 * Track a task (todo item)
 */
export declare function trackTask(task: string, metadata?: {
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: number;
    url?: string;
}): Promise<string>;
/**
 * Track an agent action
 */
export declare function trackAgent(action: string, metadata?: {
    runId?: string;
    skill?: string;
    result?: any;
    error?: string;
    url?: string;
}): Promise<string>;
