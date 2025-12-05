/**
 * SuperMemory Event Tracker
 * Tracks user behavior events for personalization
 */
// import { MemoryStore } from './store'; // Unused for now
import { processMemoryEvent } from './pipeline';
// Deduplication: track recent events to prevent duplicates
const recentEvents = new Map(); // key -> timestamp
const DEDUP_WINDOW_MS = 1000; // 1 second window for deduplication
/**
 * Generate deduplication key for an event
 */
function getDedupKey(event) {
    return `${event.type}:${JSON.stringify(event.value)}:${JSON.stringify(event.metadata || {})}`;
}
/**
 * Check if event is a duplicate (same event within dedup window)
 */
function isDuplicate(event) {
    const key = getDedupKey(event);
    const lastTime = recentEvents.get(key);
    const now = Date.now();
    if (lastTime && (now - lastTime) < DEDUP_WINDOW_MS) {
        return true; // Duplicate within window
    }
    // Update last seen time
    recentEvents.set(key, now);
    // Cleanup old entries (older than 5 seconds)
    for (const [k, t] of recentEvents.entries()) {
        if (now - t > 5000) {
            recentEvents.delete(k);
        }
    }
    return false;
}
/**
 * Track a user event
 */
export async function trackUserEvent(event) {
    // Check for duplicates
    if (isDuplicate(event)) {
        // Return existing event ID (we'd need to look it up, but for now just skip)
        return '';
    }
    // Use pipeline for complete write→embed→store flow
    const result = await processMemoryEvent(event);
    if (!result.success) {
        console.warn('[SuperMemory] Failed to process event:', result.error);
        return '';
    }
    return result.eventId;
}
/**
 * Track a search query
 */
export async function trackSearch(query, metadata) {
    return trackUserEvent({
        type: 'search',
        value: query,
        metadata: {
            query,
            ...metadata,
        },
    });
}
/**
 * Track a page visit
 * Enhanced with duration and interaction tracking
 */
export async function trackVisit(url, title, metadata) {
    return trackUserEvent({
        type: 'visit',
        value: url,
        metadata: {
            url,
            title,
            ...metadata,
        },
    });
}
/**
 * Track a mode switch
 */
export async function trackModeSwitch(mode) {
    return trackUserEvent({
        type: 'mode_switch',
        value: mode,
        metadata: { mode },
    });
}
/**
 * Track a bookmark
 */
export async function trackBookmark(url, metadata) {
    return trackUserEvent({
        type: 'bookmark',
        value: url,
        metadata: { url, ...metadata },
    });
}
/**
 * Track a note
 * Enhanced with preview and tags
 */
export async function trackNote(url, metadata) {
    const noteText = metadata?.notePreview || '';
    return trackUserEvent({
        type: 'note',
        value: url,
        metadata: {
            url,
            noteLength: noteText.length,
            notePreview: noteText.substring(0, 200),
            ...metadata,
        },
    });
}
/**
 * Track a prefetch action
 */
export async function trackPrefetch(url, metadata) {
    return trackUserEvent({
        type: 'prefetch',
        value: url,
        metadata: { url, ...metadata },
    });
}
/**
 * Track a custom action
 */
export async function trackAction(action, metadata) {
    return trackUserEvent({
        type: 'action',
        value: action,
        metadata,
    });
}
/**
 * Track a text highlight
 * Enhanced with position and context tracking
 */
export async function trackHighlight(url, text, metadata) {
    return trackUserEvent({
        type: 'highlight',
        value: text,
        metadata: {
            url,
            text,
            ...metadata,
        },
    });
}
/**
 * Track a screenshot capture
 * Enhanced with size and format tracking
 */
export async function trackScreenshot(url, metadata) {
    return trackUserEvent({
        type: 'screenshot',
        value: url,
        metadata: {
            url,
            ...metadata,
        },
    });
}
/**
 * Track a task (todo item)
 */
export async function trackTask(task, metadata) {
    return trackUserEvent({
        type: 'task',
        value: task,
        metadata: { ...metadata },
    });
}
/**
 * Track an agent action
 */
export async function trackAgent(action, metadata) {
    return trackUserEvent({
        type: 'agent',
        value: action,
        metadata: { ...metadata },
    });
}
