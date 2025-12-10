/**
 * Enhanced Redix Hook
 * Integrates memory profiler and advanced optimizer
 */

import { useEffect, useState } from 'react';
import { isRedixMode } from '../lib/redix-mode';
import { getMemoryProfiler, getMemoryUsageMB } from '../lib/redix-mode/memory-profiler';
import { getRedixOptimizer } from '../lib/redix-mode/advanced-optimizer';

export interface RedixStats {
  memoryMB: number;
  memoryTrend: 'increasing' | 'decreasing' | 'stable';
  averageMemoryMB: number;
  peakMemoryMB: number;
  activeTabs: number;
  maxActiveTabs: number;
  isOptimized: boolean;
}

export function useEnhancedRedix() {
  const [stats, setStats] = useState<RedixStats>({
    memoryMB: 0,
    memoryTrend: 'stable',
    averageMemoryMB: 0,
    peakMemoryMB: 0,
    activeTabs: 0,
    maxActiveTabs: 5,
    isOptimized: false,
  });

  const [isEnabled, setIsEnabled] = useState(isRedixMode());

  useEffect(() => {
    if (!isEnabled) return;

    // Initialize optimizer
    const optimizer = getRedixOptimizer();
    optimizer.initialize();

    // Initialize profiler
    const profiler = getMemoryProfiler({
      warning: 350,
      critical: 500,
      target: 250,
    });

    // Set up callbacks
    profiler.onWarning(snapshot => {
      console.warn('[Redix] Memory warning:', snapshot.total / (1024 * 1024), 'MB');
    });

    profiler.onCritical(snapshot => {
      console.error('[Redix] Critical memory usage:', snapshot.total / (1024 * 1024), 'MB');
      optimizer.performAggressiveCleanup();
    });

    // Start monitoring
    profiler.startMonitoring(5000);

    // Update stats periodically
    const interval = setInterval(() => {
      const memoryMB = getMemoryUsageMB();
      const trend = profiler.getMemoryTrend();
      const avgMemory = profiler.getAverageMemoryMB();
      const peakMemory = profiler.getPeakMemoryMB();
      const optimizerStats = optimizer.getStats();

      setStats({
        memoryMB,
        memoryTrend: trend,
        averageMemoryMB: avgMemory,
        peakMemoryMB: peakMemory,
        activeTabs: optimizerStats.activeTabs,
        maxActiveTabs: optimizerStats.maxActiveTabs,
        isOptimized: true,
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      profiler.stopMonitoring();
      optimizer.shutdown();
    };
  }, [isEnabled]);

  return {
    isEnabled,
    stats,
    toggleRedix: () => {
      const { toggleRedixMode } = require('../lib/redix-mode');
      toggleRedixMode();
      setIsEnabled(isRedixMode());
    },
  };
}
