/**
 * Memory Monitor
 * Tracks RAM usage and auto-unloads tabs when memory is low
 */

// PR: Telepathy Upgrade - Aggressive lag fixes
const MEMORY_THRESHOLD = 0.8; // 80% of available memory
const MEMORY_CRITICAL = 0.9; // 90% - aggressive cleanup
const MEMORY_MAX_GB = 2.5; // Max 2.5GB (down from 3GB) - Telepathy upgrade
const VISION_DISABLE_THRESHOLD_GB = 6.0; // Auto-disable vision mode under 6GB RAM
const CHECK_INTERVAL = 5000; // Check every 5 seconds

let memoryCheckInterval: ReturnType<typeof setInterval> | null = null;

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  percentage: number;
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): MemoryStats | null {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    // Browser environment - use performance.memory if available
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      const total = mem.jsHeapSizeLimit || mem.totalJSHeapSize;
      const used = mem.usedJSHeapSize;
      return {
        heapUsed: used,
        heapTotal: total,
        external: 0,
        rss: used,
        percentage: total > 0 ? used / total : 0,
      };
    }
    return null;
  }

  const mem = process.memoryUsage();
  const total = mem.heapTotal + mem.external;
  const used = mem.heapUsed + mem.external;

  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rss: mem.rss,
    percentage: total > 0 ? used / total : 0,
  };
}

/**
 * Check if memory is low
 */
export function isMemoryLow(): boolean {
  const stats = getMemoryUsage();
  if (!stats) return false;
  return stats.percentage >= MEMORY_THRESHOLD;
}

/**
 * Start memory monitoring
 */
export function startMemoryMonitoring(onLowMemory?: () => void, onCritical?: () => void): void {
  if (memoryCheckInterval) {
    stopMemoryMonitoring();
  }

  memoryCheckInterval = setInterval(() => {
    const stats = getMemoryUsage();
    if (!stats) return;

    // Check absolute memory (RSS) for 4GB devices
    const rssGB = stats.rss / (1024 * 1024 * 1024);

    if (rssGB > MEMORY_MAX_GB || stats.percentage >= MEMORY_CRITICAL) {
      // Critical: >3GB RSS or >90% memory
      console.warn(
        `[MemoryMonitor] Critical memory: ${rssGB.toFixed(2)}GB (${(stats.percentage * 100).toFixed(1)}%)`
      );
      onCritical?.();
    } else if (stats.percentage >= MEMORY_THRESHOLD) {
      // Low: >80% memory
      console.warn(
        `[MemoryMonitor] Low memory: ${rssGB.toFixed(2)}GB (${(stats.percentage * 100).toFixed(1)}%)`
      );
      onLowMemory?.();
    }
  }, CHECK_INTERVAL);
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring(): void {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
}

/**
 * Unload inactive tabs to free memory
 */
export async function unloadInactiveTabs(): Promise<number> {
  try {
    const { useTabsStore } = await import('../../state/tabsStore');
    const tabsState = useTabsStore.getState();
    const tabs = tabsState.tabs;
    const activeId = tabsState.activeId;

    // Find inactive tabs (not active, not pinned)
    const inactiveTabs = tabs.filter(tab => tab.id !== activeId && !tab.pinned && !tab.sleeping);

    if (inactiveTabs.length === 0) return 0;

    // Unload oldest inactive tabs (up to 3)
    const tabsToUnload = inactiveTabs
      .sort((a, b) => (a.lastActiveAt || 0) - (b.lastActiveAt || 0))
      .slice(0, 3);

    let unloadedCount = 0;
    for (const tab of tabsToUnload) {
      try {
        // Mark tab as sleeping (will be handled by tab suspension service)
        const { useTabsStore } = await import('../../state/tabsStore');
        useTabsStore.getState().updateTab(tab.id, { sleeping: true });
        unloadedCount++;
      } catch (error) {
        console.warn(`[MemoryMonitor] Failed to unload tab ${tab.id}:`, error);
      }
    }

    console.log(`[MemoryMonitor] Unloaded ${unloadedCount} tabs to free memory`);
    return unloadedCount;
  } catch (error) {
    console.error('[MemoryMonitor] Failed to unload tabs:', error);
    return 0;
  }
}
