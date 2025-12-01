/**
 * Memory Limits - Test and enforce memory constraints for low-end devices
 */

const MAX_MEMORY_MB = 3072; // 3GB limit
const WARNING_THRESHOLD_MB = 2048; // 2GB warning

/**
 * Check current memory usage
 */
export function getMemoryUsage(): {
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentage: number;
} {
  if (typeof performance === 'undefined' || !(performance as any).memory) {
    return {
      usedMB: 0,
      totalMB: 0,
      limitMB: MAX_MEMORY_MB,
      percentage: 0,
    };
  }

  const memInfo = (performance as any).memory;
  const usedMB = memInfo.usedJSHeapSize / 1048576;
  const totalMB = memInfo.totalJSHeapSize / 1048576;
  const limitMB = memInfo.jsHeapSizeLimit / 1048576;
  const percentage = (usedMB / limitMB) * 100;

  return { usedMB, totalMB, limitMB, percentage };
}

/**
 * Check if memory usage is high
 */
export function isMemoryHigh(): boolean {
  const { usedMB } = getMemoryUsage();
  return usedMB > WARNING_THRESHOLD_MB;
}

/**
 * Check if memory limit is exceeded
 */
export function isMemoryExceeded(): boolean {
  const { usedMB } = getMemoryUsage();
  return usedMB > MAX_MEMORY_MB;
}

/**
 * Force garbage collection if available (Chrome DevTools)
 */
export function forceGarbageCollection(): void {
  if (typeof window !== 'undefined' && (window as any).gc) {
    (window as any).gc();
    console.log('[MemoryLimits] Forced garbage collection');
  } else {
    console.warn('[MemoryLimits] Garbage collection not available (requires --js-flags=--expose-gc)');
  }
}

/**
 * Monitor memory and take action if needed
 */
export function startMemoryMonitoring(intervalMs: number = 30000): () => void {
  const interval = setInterval(() => {
    const { usedMB, percentage } = getMemoryUsage();

    if (isMemoryExceeded()) {
      console.error(`[MemoryLimits] Memory limit exceeded: ${usedMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`);
      
      // Force cleanup
      forceGarbageCollection();
      
      // Emit event for UI to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('memory-limit-exceeded', {
            detail: { usedMB, percentage },
          })
        );
      }
    } else if (isMemoryHigh()) {
      console.warn(`[MemoryLimits] High memory usage: ${usedMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`);
      
      // Emit warning event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('memory-warning', {
            detail: { usedMB, percentage },
          })
        );
      }
    }
  }, intervalMs);

  return () => clearInterval(interval);
}

