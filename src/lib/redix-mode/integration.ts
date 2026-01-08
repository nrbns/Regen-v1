/**
 * Redix Mode Integration
 * Centralized integration point for all Redix features
 */

import { isRedixMode } from '../redix-mode';
import { getRedixOptimizer } from './advanced-optimizer';
import { getMemoryProfiler } from './memory-profiler';
// import { unloadWebview } from '../../utils/tabEviction'; // Unused

/**
 * Initialize Redix mode features
 */
export async function initializeRedixMode(): Promise<void> {
  if (!isRedixMode()) return;

  console.log('[Redix] Initializing Redix mode...');

  // Initialize optimizer
  const optimizer = getRedixOptimizer();
  optimizer.initialize();

  // Initialize profiler
  const profiler = getMemoryProfiler({
    warning: 350,
    critical: 500,
    target: 250,
  });

  // Set up memory monitoring
  profiler.onWarning(snapshot => {
    console.warn('[Redix] Memory warning:', Math.round(snapshot.total / (1024 * 1024)), 'MB');
  });

  profiler.onCritical(() => {
    console.error('[Redix] Critical memory usage - performing cleanup');
    optimizer.performAggressiveCleanup();
  });

  profiler.startMonitoring(5000);

  // Apply optimizations
  optimizer.applyRenderOptimizations();

  console.log('[Redix] Redix mode initialized');
}

/**
 * Register tab for Redix optimization
 */
export function registerTabForRedix(tabId: string): void {
  if (!isRedixMode()) return;

  const optimizer = getRedixOptimizer();
  optimizer.registerTab(tabId);
}

/**
 * Mark tab as accessed
 */
export function markTabAccessed(tabId: string): void {
  if (!isRedixMode()) return;

  const optimizer = getRedixOptimizer();
  optimizer.markTabAccessed(tabId);
}

/**
 * Unregister tab
 */
export function unregisterTabFromRedix(tabId: string): void {
  if (!isRedixMode()) return;

  const optimizer = getRedixOptimizer();
  optimizer.unregisterTab(tabId);
}

/**
 * Get Redix stats
 */
export function getRedixStats() {
  if (!isRedixMode()) {
    return null;
  }

  const optimizer = getRedixOptimizer();
  const profiler = getMemoryProfiler();

  const optimizerStats = optimizer.getStats();
  return {
    memoryTrend: profiler.getMemoryTrend(),
    averageMemoryMB: profiler.getAverageMemoryMB(),
    peakMemoryMB: profiler.getPeakMemoryMB(),
    ...optimizerStats,
    memoryMB: profiler.getCurrentMemoryMB(), // Override if optimizer also provides memoryMB
  };
}

/**
 * Force cleanup
 */
export async function forceRedixCleanup(): Promise<void> {
  if (!isRedixMode()) return;

  const optimizer = getRedixOptimizer();
  await optimizer.performAggressiveCleanup();
}
