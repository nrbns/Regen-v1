/**
 * Performance monitoring utilities
 * Tracks startup time, memory usage, and performance metrics
 */

interface PerformanceMetrics {
  timeToFirstPaint?: number;
  timeToInteractive?: number;
  timeToLoad?: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private startTime: number;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.startTime = performance.now();
    this.init();
  }

  private init() {
    // Measure Time to First Paint (TTFP)
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.metrics.timeToFirstPaint = performance.now() - this.startTime;
        this.logMetric('timeToFirstPaint', this.metrics.timeToFirstPaint);
      });
    }

    // Measure Time to Interactive (TTI)
    if (document.readyState === 'complete') {
      this.measureTTI();
    } else {
      window.addEventListener('load', () => this.measureTTI());
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      this.monitorMemory();
    }

    // Track navigation timing
    this.trackNavigationTiming();
  }

  private measureTTI() {
    // Time to Interactive: when DOM is ready and main thread is idle
    if (document.readyState === 'complete') {
      const loadTime = performance.now() - this.startTime;
      this.metrics.timeToLoad = loadTime;
      this.logMetric('timeToLoad', loadTime);

      // TTI is typically when all critical resources are loaded
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.metrics.timeToInteractive = performance.now() - this.startTime;
          this.logMetric('timeToInteractive', this.metrics.timeToInteractive);
        });
      }
    }
  }

  private monitorMemory() {
    const memory = (performance as any).memory;
    if (memory) {
      this.metrics.memoryUsage = memory.usedJSHeapSize;

      // Suppress routine memory logs entirely - they're too noisy
      // Only warn if memory exceeds 500MB (reasonable threshold for modern browsers)
      // Modern browsers can easily handle 500MB+ of JS heap memory
      setInterval(() => {
        const currentMemory = memory.usedJSHeapSize;
        // Only warn at 500MB+ (suppress warnings below this threshold)
        if (currentMemory > 500 * 1024 * 1024) {
          const memoryMB = (currentMemory / 1024 / 1024).toFixed(2);
          console.warn(`[Perf] High memory usage: ${memoryMB} MB`);
        }
        // Suppress all routine memory logs - not useful for debugging
      }, 60000);
    }
  }

  private trackNavigationTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              console.log('[Perf] Navigation timing:', {
                domContentLoaded:
                  navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                load: navEntry.loadEventEnd - navEntry.loadEventStart,
                total: navEntry.loadEventEnd - navEntry.fetchStart,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
      } catch {
        // PerformanceObserver not supported
      }
    }
  }

  private logMetric(name: string, value: number) {
    console.log(`[Perf] ${name}: ${value.toFixed(2)}ms`);

    // Send to telemetry if available
    if (typeof window !== 'undefined' && (window as any).ipc) {
      try {
        (window as any).ipc.telemetry?.trackPerf?.(name, Math.round(value));
      } catch {
        // IPC not available
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function initPerformanceMonitoring(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function getPerformanceMetrics(): PerformanceMetrics {
  return performanceMonitor?.getMetrics() || {};
}
