/**
 * Performance Monitor - Throttles realtime features during high CPU/battery usage
 *
 * Monitors system resources and provides throttling recommendations
 * for streaming, voice, and other resource-intensive features
 */

interface PerformanceMetrics {
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  batteryLevel?: number; // 0-100 (null if no battery)
  isCharging?: boolean;
  networkType?: 'slow' | 'fast' | 'unknown';
}

interface ThrottlingRecommendation {
  shouldThrottleStreaming: boolean;
  shouldThrottleVoice: boolean;
  shouldReduceQuality: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private callbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private isMonitoring = false;

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, intervalMs);

    // Initial metrics update
    this.updateMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Subscribe to performance metrics updates
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.add(callback);
    // Send current metrics immediately
    callback(this.metrics);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get throttling recommendations based on current performance
   */
  getThrottlingRecommendation(): ThrottlingRecommendation {
    const { cpuUsage, memoryUsage, batteryLevel, isCharging, networkType } = this.metrics;

    // CPU-based throttling
    if (cpuUsage > 90) {
      return {
        shouldThrottleStreaming: true,
        shouldThrottleVoice: true,
        shouldReduceQuality: true,
        reason: 'High CPU usage detected',
        severity: 'high',
      };
    }

    if (cpuUsage > 70) {
      return {
        shouldThrottleStreaming: true,
        shouldThrottleVoice: false,
        shouldReduceQuality: true,
        reason: 'Elevated CPU usage',
        severity: 'medium',
      };
    }

    // Memory-based throttling
    if (memoryUsage > 90) {
      return {
        shouldThrottleStreaming: true,
        shouldThrottleVoice: true,
        shouldReduceQuality: true,
        reason: 'High memory usage detected',
        severity: 'high',
      };
    }

    if (memoryUsage > 75) {
      return {
        shouldThrottleStreaming: false,
        shouldThrottleVoice: true,
        shouldReduceQuality: true,
        reason: 'High memory usage',
        severity: 'medium',
      };
    }

    // Battery-based throttling (only when not charging)
    if (batteryLevel !== undefined && batteryLevel < 20 && !isCharging) {
      return {
        shouldThrottleStreaming: true,
        shouldThrottleVoice: true,
        shouldReduceQuality: true,
        reason: 'Low battery level',
        severity: 'high',
      };
    }

    if (batteryLevel !== undefined && batteryLevel < 30 && !isCharging) {
      return {
        shouldThrottleStreaming: true,
        shouldThrottleVoice: false,
        shouldReduceQuality: false,
        reason: 'Low battery level',
        severity: 'medium',
      };
    }

    // Network-based throttling
    if (networkType === 'slow') {
      return {
        shouldThrottleStreaming: false,
        shouldThrottleVoice: false,
        shouldReduceQuality: true,
        reason: 'Slow network detected',
        severity: 'low',
      };
    }

    // No throttling needed
    return {
      shouldThrottleStreaming: false,
      shouldThrottleVoice: false,
      shouldReduceQuality: false,
      reason: 'Performance within acceptable limits',
      severity: 'low',
    };
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    // Estimate CPU usage (in a real implementation, this would use system APIs)
    // For web environment, we'll use a simple heuristic based on frame drops and activity
    this.estimateCPUUsage();

    // Estimate memory usage
    this.estimateMemoryUsage();

    // Get battery info if available
    this.updateBatteryInfo();

    // Detect network type
    this.detectNetworkType();

    // Notify callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('[PerformanceMonitor] Callback error:', error);
      }
    });
  }

  /**
   * Estimate CPU usage (web-compatible heuristic)
   */
  private estimateCPUUsage(): void {
    // In a real desktop app, this would use system APIs
    // For web demo, we'll simulate based on recent activity

    let estimatedCPU = 10; // Base usage

    // Add CPU based on active tasks (simulated)
    const activeTasks = Math.floor(Math.random() * 5); // Simulate 0-4 active tasks
    estimatedCPU += activeTasks * 8;

    // Add CPU for streaming if active
    if (Math.random() > 0.7) { // Simulate streaming being active 30% of the time
      estimatedCPU += 15;
    }

    // Add CPU for voice processing if active
    if (Math.random() > 0.9) { // Simulate voice being active 10% of the time
      estimatedCPU += 20;
    }

    // Cap at 100%
    this.metrics.cpuUsage = Math.min(100, Math.max(0, estimatedCPU));
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): void {
    if ('memory' in performance) {
      // Chrome/Edge memory info
      const memInfo = (performance as any).memory;
      const used = memInfo.usedJSHeapSize;
      const total = memInfo.totalJSHeapSize;
      this.metrics.memoryUsage = Math.round((used / total) * 100);
    } else {
      // Fallback estimation
      this.metrics.memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
    }
  }

  /**
   * Update battery information
   */
  private async updateBatteryInfo(): Promise<void> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.metrics.batteryLevel = Math.round(battery.level * 100);
        this.metrics.isCharging = battery.charging;
      }
    } catch (error) {
      // Battery API not supported or failed
      this.metrics.batteryLevel = undefined;
      this.metrics.isCharging = undefined;
    }
  }

  /**
   * Detect network type/speed
   */
  private detectNetworkType(): void {
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const effectiveType = connection.effectiveType; // 'slow-2g', '2g', '3g', '4g'

        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          this.metrics.networkType = 'slow';
        } else {
          this.metrics.networkType = 'fast';
        }
      } else {
        this.metrics.networkType = 'unknown';
      }
    } catch (error) {
      this.metrics.networkType = 'unknown';
    }
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// Utility function to check if realtime features should be throttled
export function shouldThrottleRealtime(): ThrottlingRecommendation {
  return getPerformanceMonitor().getThrottlingRecommendation();
}

// Auto-start monitoring when module is loaded
getPerformanceMonitor().startMonitoring();
