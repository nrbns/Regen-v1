/**
 * Redix Memory Profiler
 * Advanced memory monitoring and optimization for Redix mode
 */

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss?: number; // Resident Set Size (Node.js only)
  total: number;
  breakdown?: {
    tabs: number;
    webviews: number;
    extensions: number;
    cache: number;
    other: number;
  };
}

export interface MemoryThreshold {
  warning: number; // MB - Show warning
  critical: number; // MB - Force cleanup
  target: number; // MB - Target after cleanup
}

const DEFAULT_THRESHOLDS: MemoryThreshold = {
  warning: 400, // MB
  critical: 600, // MB
  target: 250, // MB
};

class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 100;
  private thresholds: MemoryThreshold;
  private monitoringInterval: number | null = null;
  private callbacks: {
    onWarning?: (snapshot: MemorySnapshot) => void;
    onCritical?: (snapshot: MemorySnapshot) => void;
    onCleanup?: () => void;
  } = {};

  constructor(thresholds: Partial<MemoryThreshold> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot | null {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      // Browser environment - limited memory API
      return null;
    }

    const mem = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: mem.usedJSHeapSize,
      heapTotal: mem.totalJSHeapSize,
      external: mem.jsHeapSizeLimit,
      total: mem.usedJSHeapSize,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get current memory usage in MB
   */
  getCurrentMemoryMB(): number {
    const snapshot = this.takeSnapshot();
    if (!snapshot) return 0;
    return Math.round(snapshot.total / (1024 * 1024));
  }

  /**
   * Check memory thresholds and trigger callbacks
   */
  checkThresholds(): void {
    const snapshot = this.takeSnapshot();
    if (!snapshot) return;

    const memoryMB = snapshot.total / (1024 * 1024);

    if (memoryMB >= this.thresholds.critical) {
      this.callbacks.onCritical?.(snapshot);
      this.callbacks.onCleanup?.();
    } else if (memoryMB >= this.thresholds.warning) {
      this.callbacks.onWarning?.(snapshot);
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = window.setInterval(() => {
      this.checkThresholds();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get memory trend (increasing/decreasing/stable)
   */
  getMemoryTrend(samples: number = 10): 'increasing' | 'decreasing' | 'stable' {
    if (this.snapshots.length < samples) {
      return 'stable';
    }

    const recent = this.snapshots.slice(-samples);
    const first = recent[0].total;
    const last = recent[recent.length - 1].total;
    const diff = last - first;
    const threshold = first * 0.1; // 10% change threshold

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Get average memory usage over time
   */
  getAverageMemoryMB(samples: number = 10): number {
    if (this.snapshots.length === 0) return 0;

    const recent = this.snapshots.slice(-samples);
    const sum = recent.reduce((acc, snap) => acc + snap.total, 0);
    const avg = sum / recent.length;
    return Math.round(avg / (1024 * 1024));
  }

  /**
   * Get peak memory usage
   */
  getPeakMemoryMB(): number {
    if (this.snapshots.length === 0) return 0;
    const peak = Math.max(...this.snapshots.map(s => s.total));
    return Math.round(peak / (1024 * 1024));
  }

  /**
   * Estimate memory breakdown (heuristic)
   */
  estimateBreakdown(): MemorySnapshot['breakdown'] {
    // Heuristic estimation based on common browser memory patterns
    const totalMB = this.getCurrentMemoryMB();

    return {
      tabs: Math.round(totalMB * 0.5), // ~50% for tabs
      webviews: Math.round(totalMB * 0.2), // ~20% for webviews
      extensions: Math.round(totalMB * 0.1), // ~10% for extensions
      cache: Math.round(totalMB * 0.1), // ~10% for cache
      other: Math.round(totalMB * 0.1), // ~10% other
    };
  }

  /**
   * Set callbacks
   */
  onWarning(callback: (snapshot: MemorySnapshot) => void): void {
    this.callbacks.onWarning = callback;
  }

  onCritical(callback: (snapshot: MemorySnapshot) => void): void {
    this.callbacks.onCritical = callback;
  }

  onCleanup(callback: () => void): void {
    this.callbacks.onCleanup = callback;
  }

  /**
   * Clear snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }
}

// Singleton instance
let profilerInstance: MemoryProfiler | null = null;

export function getMemoryProfiler(thresholds?: Partial<MemoryThreshold>): MemoryProfiler {
  if (!profilerInstance) {
    profilerInstance = new MemoryProfiler(thresholds);
  }
  return profilerInstance;
}

/**
 * Quick memory check utility
 */
export function getMemoryUsageMB(): number {
  const profiler = getMemoryProfiler();
  return profiler.getCurrentMemoryMB();
}

/**
 * Check if memory usage is high
 */
export function isMemoryHigh(thresholdMB: number = 400): boolean {
  return getMemoryUsageMB() >= thresholdMB;
}
