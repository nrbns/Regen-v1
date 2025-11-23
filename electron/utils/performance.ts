/**
 * Performance Markers
 * Track execution time for key operations
 */

import { createLogger } from '../services/utils/logger';

const log = createLogger('performance');

interface PerformanceMarker {
  name: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

const markers = new Map<string, PerformanceMarker>();

/**
 * Start a performance marker
 */
export function startMarker(name: string, metadata?: Record<string, unknown>): void {
  markers.set(name, {
    name,
    startTime: performance.now(),
    metadata,
  });
}

/**
 * End a performance marker and log the duration
 */
export function endMarker(name: string, additionalMetadata?: Record<string, unknown>): void {
  const marker = markers.get(name);
  if (!marker) {
    log.warn('Marker not found', { marker: name });
    return;
  }

  const duration = performance.now() - marker.startTime;
  markers.delete(name);

  log.info(`[Performance] ${name} took ${duration.toFixed(2)}ms`, {
    type: 'performance',
    marker: name,
    duration: Math.round(duration * 100) / 100, // Round to 2 decimals
    ...marker.metadata,
    ...additionalMetadata,
  });
}

/**
 * Measure an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  startMarker(name, metadata);
  try {
    const result = await fn();
    endMarker(name, { success: true });
    return result;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    endMarker(name, { success: false, error: err.message });
    throw error;
  }
}

/**
 * Measure a sync function
 */
export function measureSync<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
  startMarker(name, metadata);
  try {
    const result = fn();
    endMarker(name, { success: true });
    return result;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    endMarker(name, { success: false, error: err.message });
    throw error;
  }
}

// Global performance object (Node.js performance API)
const performance = {
  now: () => {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  },
};
