/**
 * Mobile Performance Hook
 * Monitors and optimizes performance for mobile devices
 */

import { useEffect, useState } from 'react';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  batteryLevel: number;
  isLowBattery: boolean;
  isReducedMotion: boolean;
}

export function useMobilePerformance(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    batteryLevel: 100,
    isLowBattery: false,
    isReducedMotion: false,
  });

  useEffect(() => {
    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Battery API
    const updateBattery = (battery: any) => {
      setMetrics(prev => ({
        ...prev,
        batteryLevel: Math.round(battery.level * 100),
        isLowBattery: battery.level < 0.2,
      }));
    };

    // Memory API (if available)
    if ((performance as any).memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(
          ((performance as any).memory.usedJSHeapSize /
            (performance as any).memory.jsHeapSizeLimit) *
            100
        ),
      }));
    }

    // Check battery status
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then(updateBattery);
    }

    setMetrics(prev => ({
      ...prev,
      isReducedMotion: prefersReducedMotion,
    }));
  }, []);

  return metrics;
}
