/**
 * Redix Advanced Optimizer
 * Aggressive memory and performance optimizations for Redix mode
 */

import { isRedixMode } from '../redix-mode';
import { getMemoryProfiler } from './memory-profiler';

export interface OptimizationStrategy {
  // Tab management
  maxActiveTabs: number;
  evictInactiveTabs: boolean;
  evictionTimeout: number; // ms

  // Module management
  lazyLoadModules: boolean;
  unloadHeavyLibs: boolean;
  moduleWhitelist: string[]; // Always-loaded modules

  // Cache management
  clearCacheOnLowMemory: boolean;
  cacheSizeLimit: number; // MB

  // Render optimizations
  reduceAnimations: boolean;
  lowerImageQuality: boolean;
  disableBackgroundProcesses: boolean;
}

const DEFAULT_STRATEGY: OptimizationStrategy = {
  maxActiveTabs: 3,
  evictInactiveTabs: true,
  evictionTimeout: 30000, // 30 seconds
  lazyLoadModules: true,
  unloadHeavyLibs: true,
  moduleWhitelist: [],
  clearCacheOnLowMemory: true,
  cacheSizeLimit: 50, // MB
  reduceAnimations: true,
  lowerImageQuality: true,
  disableBackgroundProcesses: true,
};

class RedixOptimizer {
  private strategy: OptimizationStrategy;
  private activeTabs: Set<string> = new Set();
  private tabAccessTimes: Map<string, number> = new Map();
  private cleanupInterval: number | null = null;

  constructor(strategy: Partial<OptimizationStrategy> = {}) {
    this.strategy = { ...DEFAULT_STRATEGY, ...strategy };
  }

  /**
   * Initialize optimizer (call when Redix mode enabled)
   */
  initialize(): void {
    if (!isRedixMode()) return;

    // Start cleanup interval
    this.startCleanupInterval();

    // Set up memory monitoring
    const profiler = getMemoryProfiler({
      warning: 350,
      critical: 500,
      target: 250,
    });

    profiler.onCritical(() => {
      this.performAggressiveCleanup();
    });

    profiler.startMonitoring(5000);

    // Apply render optimizations
    this.applyRenderOptimizations();

    // Clear initial cache if needed
    if (this.strategy.clearCacheOnLowMemory) {
      this.clearExcessCache();
    }
  }

  /**
   * Register active tab
   */
  registerTab(tabId: string): void {
    this.activeTabs.add(tabId);
    this.tabAccessTimes.set(tabId, Date.now());
  }

  /**
   * Unregister tab
   */
  unregisterTab(tabId: string): void {
    this.activeTabs.delete(tabId);
    this.tabAccessTimes.delete(tabId);
  }

  /**
   * Mark tab as accessed
   */
  markTabAccessed(tabId: string): void {
    this.tabAccessTimes.set(tabId, Date.now());
  }

  /**
   * Evict inactive tabs
   */
  async evictInactiveTabs(): Promise<void> {
    if (!this.strategy.evictInactiveTabs) return;
    if (this.activeTabs.size <= this.strategy.maxActiveTabs) return;

    const now = Date.now();
    const tabsToEvict: string[] = [];

    // Find inactive tabs
    for (const [tabId, lastAccess] of this.tabAccessTimes.entries()) {
      if (now - lastAccess > this.strategy.evictionTimeout) {
        tabsToEvict.push(tabId);
      }
    }

    // Sort by access time (oldest first)
    tabsToEvict.sort((a, b) => {
      const timeA = this.tabAccessTimes.get(a) || 0;
      const timeB = this.tabAccessTimes.get(b) || 0;
      return timeA - timeB;
    });

    // Evict until we're under the limit
    const tabsToEvictNow = tabsToEvict.slice(0, this.activeTabs.size - this.strategy.maxActiveTabs);

    for (const tabId of tabsToEvictNow) {
      try {
        // Note: unloadTab requires full Tab object
        // This would need proper tab store access - skipping for now
        console.warn('[AdvancedOptimizer] Tab unloading requires Tab object');
        this.unregisterTab(tabId);
      } catch (error) {
        console.warn(`[RedixOptimizer] Failed to evict tab ${tabId}:`, error);
      }
    }
  }

  /**
   * Clear excess cache
   */
  async clearExcessCache(): Promise<void> {
    if (typeof caches === 'undefined') return;

    try {
      const cacheNames = await caches.keys();
      const profiler = getMemoryProfiler();
      const memoryMB = profiler.getCurrentMemoryMB();

      if (memoryMB > this.strategy.cacheSizeLimit) {
        // Clear oldest caches first
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
    } catch (error) {
      console.warn('[RedixOptimizer] Failed to clear cache:', error);
    }
  }

  /**
   * Apply render optimizations
   */
  applyRenderOptimizations(): void {
    if (!this.strategy.reduceAnimations && !this.strategy.lowerImageQuality) {
      return;
    }

    // Add CSS to reduce animations
    if (this.strategy.reduceAnimations) {
      const style = document.createElement('style');
      style.id = 'redix-optimizations';
      style.textContent = `
        * {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Reduce image quality via CSS
    if (this.strategy.lowerImageQuality) {
      const style =
        document.getElementById('redix-optimizations') || document.createElement('style');
      if (!style.id) style.id = 'redix-optimizations';
      style.textContent += `
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      `;
      if (!document.getElementById('redix-optimizations')) {
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Perform aggressive cleanup
   */
  async performAggressiveCleanup(): Promise<void> {
    console.log('[RedixOptimizer] Performing aggressive cleanup...');

    // Evict all inactive tabs
    await this.evictInactiveTabs();

    // Clear all caches
    await this.clearExcessCache();

    // Force garbage collection (if available)
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }

    // Trigger memory cleanup
    const profiler = getMemoryProfiler();
    profiler.clearSnapshots();

    // Clear any large objects
    // This is a placeholder - implement based on your app structure
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = window.setInterval(() => {
      if (isRedixMode()) {
        this.evictInactiveTabs();
        this.clearExcessCache();
      } else {
        this.stopCleanupInterval();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Update strategy
   */
  updateStrategy(strategy: Partial<OptimizationStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };

    // Reinitialize if Redix mode is active
    if (isRedixMode()) {
      this.initialize();
    }
  }

  /**
   * Get current strategy
   */
  getStrategy(): OptimizationStrategy {
    return { ...this.strategy };
  }

  /**
   * Get optimization stats
   */
  getStats(): {
    activeTabs: number;
    maxActiveTabs: number;
    memoryMB: number;
    tabsEvicted: number;
  } {
    const profiler = getMemoryProfiler();
    return {
      activeTabs: this.activeTabs.size,
      maxActiveTabs: this.strategy.maxActiveTabs,
      memoryMB: profiler.getCurrentMemoryMB(),
      tabsEvicted: 0, // Track this if needed
    };
  }

  /**
   * Shutdown optimizer
   */
  shutdown(): void {
    this.stopCleanupInterval();
    const profiler = getMemoryProfiler();
    profiler.stopMonitoring();
  }
}

// Singleton instance
let optimizerInstance: RedixOptimizer | null = null;

export function getRedixOptimizer(strategy?: Partial<OptimizationStrategy>): RedixOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new RedixOptimizer(strategy);
  }
  return optimizerInstance;
}
