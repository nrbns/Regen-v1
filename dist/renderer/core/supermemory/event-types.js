/**
 * SuperMemory Event Types
 * Centralized type definitions for all memory events
 */
/**
 * Event type guards for type-safe metadata access
 */
export function isSearchEvent(event) {
    return event.type === 'search';
}
export function isVisitEvent(event) {
    return event.type === 'visit';
}
export function isHighlightEvent(event) {
    return event.type === 'highlight';
}
export function isScreenshotEvent(event) {
    return event.type === 'screenshot';
}
export function isNoteEvent(event) {
    return event.type === 'note';
}
export function isBookmarkEvent(event) {
    return event.type === 'bookmark';
}
export function isTaskEvent(event) {
    return event.type === 'task';
}
export function isAgentEvent(event) {
    return event.type === 'agent';
}
/**
 * Event type display names for UI
 */
export const EVENT_TYPE_DISPLAY_NAMES = {
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
export const EVENT_TYPE_ICONS = {
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
export const EVENT_TYPE_COLORS = {
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
