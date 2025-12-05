/**
 * SuperMemory Event Types
 * Centralized type definitions for all memory events
 */
/**
 * All supported memory event types
 */
export type MemoryEventType = 'search' | 'visit' | 'mode_switch' | 'bookmark' | 'note' | 'prefetch' | 'action' | 'highlight' | 'screenshot' | 'task' | 'agent' | 'summary';
/**
 * Base metadata interface for all events
 */
export interface BaseEventMetadata {
    url?: string;
    title?: string;
    tabId?: string;
    containerId?: string;
    mode?: string;
    timestamp?: number;
    [key: string]: any;
}
/**
 * Search event metadata
 */
export interface SearchEventMetadata extends BaseEventMetadata {
    query: string;
    resultsCount?: number;
    searchEngine?: string;
    clickedResult?: {
        url: string;
        title: string;
        position: number;
    };
}
/**
 * Visit event metadata
 */
export interface VisitEventMetadata extends BaseEventMetadata {
    url: string;
    title?: string;
    referrer?: string;
    duration?: number;
    scrollDepth?: number;
    interactionCount?: number;
}
/**
 * Highlight event metadata
 */
export interface HighlightEventMetadata extends BaseEventMetadata {
    url: string;
    text: string;
    context?: string;
    position?: {
        start: number;
        end: number;
    };
    color?: string;
    note?: string;
}
/**
 * Screenshot event metadata
 */
export interface ScreenshotEventMetadata extends BaseEventMetadata {
    url: string;
    title?: string;
    size?: {
        width: number;
        height: number;
    };
    format?: 'png' | 'jpeg' | 'webp';
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/**
 * Note event metadata
 */
export interface NoteEventMetadata extends BaseEventMetadata {
    url: string;
    title?: string;
    noteLength?: number;
    notePreview?: string;
    tags?: string[];
}
/**
 * Bookmark event metadata
 */
export interface BookmarkEventMetadata extends BaseEventMetadata {
    url: string;
    title?: string;
    folder?: string;
    tags?: string[];
}
/**
 * Task event metadata
 */
export interface TaskEventMetadata extends BaseEventMetadata {
    task: string;
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: number;
    url?: string;
    notes?: string;
}
/**
 * Agent event metadata
 */
export interface AgentEventMetadata extends BaseEventMetadata {
    action: string;
    runId?: string;
    skill?: string;
    result?: any;
    error?: string;
    duration?: number;
    tokensUsed?: number;
}
/**
 * Mode switch event metadata
 */
export interface ModeSwitchEventMetadata extends BaseEventMetadata {
    fromMode: string;
    toMode: string;
    reason?: string;
}
/**
 * Prefetch event metadata
 */
export interface PrefetchEventMetadata extends BaseEventMetadata {
    url: string;
    success?: boolean;
    loadTime?: number;
    cacheHit?: boolean;
}
/**
 * Action event metadata
 */
export interface ActionEventMetadata extends BaseEventMetadata {
    action: string;
    category?: string;
    result?: any;
    error?: string;
}
/**
 * Summary event metadata
 */
export interface SummaryEventMetadata extends BaseEventMetadata {
    summaryType: 'daily' | 'weekly' | 'monthly';
    periodStart: number;
    periodEnd: number;
    eventCount: number;
    eventIds: string[];
    tags?: string[];
}
/**
 * Main MemoryEvent interface
 */
export interface MemoryEvent {
    id: string;
    type: MemoryEventType;
    value: string | any;
    metadata?: BaseEventMetadata | SearchEventMetadata | VisitEventMetadata | HighlightEventMetadata | ScreenshotEventMetadata | NoteEventMetadata | BookmarkEventMetadata | TaskEventMetadata | AgentEventMetadata | ModeSwitchEventMetadata | PrefetchEventMetadata | ActionEventMetadata | SummaryEventMetadata;
    ts: number;
    score?: number;
}
/**
 * Event type guards for type-safe metadata access
 */
export declare function isSearchEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'search';
    metadata?: SearchEventMetadata;
};
export declare function isVisitEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'visit';
    metadata?: VisitEventMetadata;
};
export declare function isHighlightEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'highlight';
    metadata?: HighlightEventMetadata;
};
export declare function isScreenshotEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'screenshot';
    metadata?: ScreenshotEventMetadata;
};
export declare function isNoteEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'note';
    metadata?: NoteEventMetadata;
};
export declare function isBookmarkEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'bookmark';
    metadata?: BookmarkEventMetadata;
};
export declare function isTaskEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'task';
    metadata?: TaskEventMetadata;
};
export declare function isAgentEvent(event: MemoryEvent): event is MemoryEvent & {
    type: 'agent';
    metadata?: AgentEventMetadata;
};
/**
 * Event type display names for UI
 */
export declare const EVENT_TYPE_DISPLAY_NAMES: Record<MemoryEventType, string>;
/**
 * Event type icons (using Lucide icon names)
 */
export declare const EVENT_TYPE_ICONS: Record<MemoryEventType, string>;
/**
 * Event type colors for UI
 */
export declare const EVENT_TYPE_COLORS: Record<MemoryEventType, string>;
