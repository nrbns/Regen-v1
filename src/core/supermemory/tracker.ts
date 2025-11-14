/**
 * SuperMemory Event Tracker
 * Tracks user behavior events for personalization
 */

import { MemoryStore, MemoryEvent } from './store';

/**
 * Track a user event
 */
export async function trackEvent(
  type: MemoryEvent['type'],
  value: any,
  metadata?: MemoryEvent['metadata']
): Promise<string> {
  return MemoryStore.saveEvent({
    type,
    value,
    metadata,
  });
}

/**
 * Track a search query
 */
export function trackSearch(query: string, metadata?: { url?: string; mode?: string }): Promise<string> {
  return trackEvent('search', query, metadata);
}

/**
 * Track a page visit
 */
export function trackVisit(url: string, metadata?: { title?: string; tabId?: string; duration?: number }): Promise<string> {
  return trackEvent('visit', url, {
    url,
    ...metadata,
  });
}

/**
 * Track a mode switch
 */
export function trackModeSwitch(mode: string): Promise<string> {
  return trackEvent('mode_switch', mode, { mode });
}

/**
 * Track a bookmark
 */
export function trackBookmark(url: string, metadata?: { title?: string }): Promise<string> {
  return trackEvent('bookmark', url, { url, ...metadata });
}

/**
 * Track a note
 */
export function trackNote(url: string, metadata?: { title?: string; noteLength?: number }): Promise<string> {
  return trackEvent('note', url, { url, ...metadata });
}

/**
 * Track a prefetch action
 */
export function trackPrefetch(url: string, metadata?: { success?: boolean }): Promise<string> {
  return trackEvent('prefetch', url, { url, ...metadata });
}

/**
 * Track a custom action
 */
export function trackAction(action: string, metadata?: Record<string, any>): Promise<string> {
  return trackEvent('action', action, metadata);
}

