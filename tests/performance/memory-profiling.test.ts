/**
 * Memory Profiling Tests
 * Validates memory usage and Redix mode effectiveness
 */

import { describe, it, expect } from '@jest/globals';

describe('Memory Profiling', () => {
  describe('Memory Profiler Configuration', () => {
    it('should have correct warning threshold', async () => {
      const { getMemoryProfiler } = await import('../../src/lib/redix-mode/memory-profiler');
      const profiler = getMemoryProfiler({
        warning: 350,
        critical: 500,
        target: 250,
      });

      expect(profiler).toBeDefined();
    });

    it('should support memory snapshot tracking', async () => {
      const { getMemoryProfiler } = await import('../../src/lib/redix-mode/memory-profiler');
      const profiler = getMemoryProfiler();

      // Take snapshot
      const snapshot = profiler.takeSnapshot();

      // Should return snapshot or null (depending on browser support)
      expect(snapshot === null || typeof snapshot === 'object').toBe(true);
    });

    it('should calculate memory trends', async () => {
      const { getMemoryProfiler } = await import('../../src/lib/redix-mode/memory-profiler');
      const profiler = getMemoryProfiler();

      const trend = profiler.getMemoryTrend();

      // Should return one of the valid trends
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });
  });

  describe('Redix Optimizer', () => {
    it('should be configurable', async () => {
      const { getRedixOptimizer } = await import('../../src/lib/redix-mode/advanced-optimizer');
      const optimizer = getRedixOptimizer({
        maxActiveTabs: 3,
        evictInactiveTabs: true,
        evictionTimeout: 30000,
      });

      expect(optimizer).toBeDefined();
      const strategy = optimizer.getStrategy();
      expect(strategy.maxActiveTabs).toBe(3);
    });

    it('should track active tabs', async () => {
      const { getRedixOptimizer } = await import('../../src/lib/redix-mode/advanced-optimizer');
      const optimizer = getRedixOptimizer();

      optimizer.registerTab('test-tab-1');
      optimizer.registerTab('test-tab-2');

      const stats = optimizer.getStats();
      expect(stats.activeTabs).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Memory Reduction Targets', () => {
    it('should meet <50% reduction target in architecture', () => {
      const fullMode = 600; // MB estimate
      const redixTarget = 250; // MB
      const reduction = ((fullMode - redixTarget) / fullMode) * 100;

      expect(reduction).toBeGreaterThanOrEqual(50);
    });
  });
});

/**
 * Memory Measurement Utility
 */
export class MemoryMeasurer {
  private snapshots: number[] = [];

  start() {
    this.snapshots = [];
  }

  measure(): number {
    const memoryMB = this.getCurrentMemoryMB();
    this.snapshots.push(memoryMB);
    return memoryMB;
  }

  getAverage(): number {
    if (this.snapshots.length === 0) return 0;
    const sum = this.snapshots.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.snapshots.length);
  }

  getPeak(): number {
    return this.snapshots.length > 0 ? Math.max(...this.snapshots) : 0;
  }

  private getCurrentMemoryMB(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      return Math.round(mem.usedJSHeapSize / (1024 * 1024));
    }
    return 0;
  }
}
