/**
 * SuperMemory Event Tracker
 * Tracks user behavior events for personalization
 */

import { MemoryStore } from './store';
import { embedMemoryEvent } from './embedding';

export interface MemoryEvent {
  id: string;
  type: 'search' | 'visit' | 'mode_switch' | 'bookmark' | 'note' | 'prefetch' | 'action';
  value: string; // e.g. query string or url
  metadata?: { url?: string; title?: string; mode?: string; [key: string]: any };
  ts: number;
  score?: number; // recency/freq score
}

/**
 * Track a user event
 */
export async function trackUserEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): Promise<string> {
  const newEvent: MemoryEvent = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    score: 0,
    ...event,
  };
  
  await MemoryStoreInstance.saveEvent(newEvent);
  
  // Generate embeddings asynchronously (don't block)
  embedMemoryEvent(newEvent).catch(error => {
    console.warn('[SuperMemory] Failed to embed event:', error);
  });
  
  return newEvent.id;
}

/**
 * Track a search query
 */
export async function trackSearch(query: string, metadata?: { url?: string; mode?: string; title?: string }): Promise<string> {
  return trackUserEvent({
    type: 'search',
    value: query,
    metadata,
  });
}

/**
 * Track a page visit
 */
export async function trackVisit(url: string, title?: string, metadata?: { tabId?: string; containerId?: string }): Promise<string> {
  return trackUserEvent({
    type: 'visit',
    value: url,
    metadata: { url, title, ...metadata },
  });
}

/**
 * Track a mode switch
 */
export async function trackModeSwitch(mode: string): Promise<string> {
  return trackUserEvent({
    type: 'mode_switch',
    value: mode,
    metadata: { mode },
  });
}

/**
 * Track a bookmark
 */
export async function trackBookmark(url: string, metadata?: { title?: string }): Promise<string> {
  return trackUserEvent({
    type: 'bookmark',
    value: url,
    metadata: { url, ...metadata },
  });
}

/**
 * Track a note
 */
export async function trackNote(url: string, metadata?: { title?: string; noteLength?: number }): Promise<string> {
  return trackUserEvent({
    type: 'note',
    value: url,
    metadata: { url, ...metadata },
  });
}

/**
 * Track a prefetch action
 */
export async function trackPrefetch(url: string, metadata?: { success?: boolean }): Promise<string> {
  return trackUserEvent({
    type: 'prefetch',
    value: url,
    metadata: { url, ...metadata },
  });
}

/**
 * Track a custom action
 */
export async function trackAction(action: string, metadata?: Record<string, any>): Promise<string> {
  return trackUserEvent({
    type: 'action',
    value: action,
    metadata,
  });
}

