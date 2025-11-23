/**
 * Performance Markers
 * Tracks performance metrics for tab creation, IPC response time, Redix job latency
 */

import { createLogger } from '../utils/logger';

const log = createLogger('performance');

interface PerformanceMarker {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const markers: PerformanceMarker[] = [];
const MAX_MARKERS = 1000; // Keep last 1000 markers

/**
 * Record a performance marker
 */
export function recordMarker(
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  const marker: PerformanceMarker = {
    name,
    duration,
    timestamp: Date.now(),
    metadata,
  };

  markers.push(marker);

  // Keep only last MAX_MARKERS
  if (markers.length > MAX_MARKERS) {
    markers.shift();
  }

  // Log slow operations
  if (duration > 1000) {
    log.warn('Slow operation detected', { name, duration, metadata });
  }
}

/**
 * Measure and record performance
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  const result = fn();

  if (result instanceof Promise) {
    return result
      .then(value => {
        const duration = performance.now() - start;
        recordMarker(name, duration, metadata);
        return value;
      })
      .catch(error => {
        const duration = performance.now() - start;
        recordMarker(`${name}:error`, duration, { ...metadata, error: error.message });
        throw error;
      });
  }

  const duration = performance.now() - start;
  recordMarker(name, duration, metadata);
  return Promise.resolve(result);
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(name?: string): {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
} {
  const filtered = name ? markers.filter(m => m.name === name) : markers;

  if (filtered.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
    };
  }

  const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const p95Index = Math.floor(durations.length * 0.95);
  const p95 = durations[p95Index] || 0;

  return {
    count: filtered.length,
    avgDuration: avg,
    minDuration: min,
    maxDuration: max,
    p95Duration: p95,
  };
}

/**
 * Get all markers
 */
export function getAllMarkers(): PerformanceMarker[] {
  return [...markers];
}
