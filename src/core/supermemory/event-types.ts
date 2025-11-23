/**
 * SuperMemory Event Types
 * Centralized type definitions for all memory events
 */

/**
 * All supported memory event types
 */
export type MemoryEventType =
  | 'search'
  | 'visit'
  | 'mode_switch'
  | 'bookmark'
  | 'note'
  | 'prefetch'
  | 'action'
  | 'highlight'
  | 'screenshot'
  | 'task'
  | 'agent'
  | 'summary';

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
  duration?: number; // Time spent on page in seconds
  scrollDepth?: number; // 0-100, percentage scrolled
  interactionCount?: number; // Clicks, scrolls, etc.
}

/**
 * Highlight event metadata
 */
export interface HighlightEventMetadata extends BaseEventMetadata {
  url: string;
  text: string;
  context?: string; // Surrounding text
  position?: {
    start: number;
    end: number;
  };
  color?: string;
  note?: string; // Optional note attached to highlight
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
  }; // If partial screenshot
}

/**
 * Note event metadata
 */
export interface NoteEventMetadata extends BaseEventMetadata {
  url: string;
  title?: string;
  noteLength?: number;
  notePreview?: string; // First 200 chars
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
  duration?: number; // Execution time in ms
  tokensUsed?: number;
}

/**
 * Mode switch event metadata
 */
export interface ModeSwitchEventMetadata extends BaseEventMetadata {
  fromMode: string;
  toMode: string;
  reason?: string; // Why the switch happened
}

/**
 * Prefetch event metadata
 */
export interface PrefetchEventMetadata extends BaseEventMetadata {
  url: string;
  success?: boolean;
  loadTime?: number; // Time to load in ms
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
  value: string | any; // Primary value (query, URL, text, etc.)
  metadata?:
    | BaseEventMetadata
    | SearchEventMetadata
    | VisitEventMetadata
    | HighlightEventMetadata
    | ScreenshotEventMetadata
    | NoteEventMetadata
    | BookmarkEventMetadata
    | TaskEventMetadata
    | AgentEventMetadata
    | ModeSwitchEventMetadata
    | PrefetchEventMetadata
    | ActionEventMetadata
    | SummaryEventMetadata;
  ts: number; // Timestamp
  score?: number; // Recency/frequency score for suggestions
}

/**
 * Event type guards for type-safe metadata access
 */
export function isSearchEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'search'; metadata?: SearchEventMetadata } {
  return event.type === 'search';
}

export function isVisitEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'visit'; metadata?: VisitEventMetadata } {
  return event.type === 'visit';
}

export function isHighlightEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'highlight'; metadata?: HighlightEventMetadata } {
  return event.type === 'highlight';
}

export function isScreenshotEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'screenshot'; metadata?: ScreenshotEventMetadata } {
  return event.type === 'screenshot';
}

export function isNoteEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'note'; metadata?: NoteEventMetadata } {
  return event.type === 'note';
}

export function isBookmarkEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'bookmark'; metadata?: BookmarkEventMetadata } {
  return event.type === 'bookmark';
}

export function isTaskEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'task'; metadata?: TaskEventMetadata } {
  return event.type === 'task';
}

export function isAgentEvent(
  event: MemoryEvent
): event is MemoryEvent & { type: 'agent'; metadata?: AgentEventMetadata } {
  return event.type === 'agent';
}

/**
 * Event type display names for UI
 */
export const EVENT_TYPE_DISPLAY_NAMES: Record<MemoryEventType, string> = {
  search: 'Search',
  visit: 'Visit',
  mode_switch: 'Mode Switch',
  bookmark: 'Bookmark',
  note: 'Note',
  prefetch: 'Prefetch',
  action: 'Action',
  highlight: 'Highlight',
  screenshot: 'Screenshot',
  task: 'Task',
  agent: 'Agent',
  summary: 'Summary',
};

/**
 * Event type icons (using Lucide icon names)
 */
export const EVENT_TYPE_ICONS: Record<MemoryEventType, string> = {
  search: 'Search',
  visit: 'Globe',
  mode_switch: 'RefreshCw',
  bookmark: 'Bookmark',
  note: 'FileText',
  prefetch: 'Zap',
  action: 'Activity',
  highlight: 'Highlighter',
  screenshot: 'Camera',
  task: 'CheckSquare',
  agent: 'Bot',
  summary: 'FileBarChart',
};

/**
 * Event type colors for UI
 */
export const EVENT_TYPE_COLORS: Record<MemoryEventType, string> = {
  search: 'blue',
  visit: 'green',
  mode_switch: 'purple',
  bookmark: 'yellow',
  note: 'orange',
  prefetch: 'cyan',
  action: 'pink',
  highlight: 'amber',
  screenshot: 'red',
  task: 'indigo',
  agent: 'violet',
  summary: 'slate',
};
