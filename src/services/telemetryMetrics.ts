/**
 * Telemetry Metrics - Track performance, feature usage, and errors
 */

import { ipc } from '../lib/ipc-typed';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface FeatureUsage {
  feature: string;
  count: number;
  lastUsed: number;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  error: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  context?: Record<string, any>;
}

class TelemetryMetrics {
  private performanceMetrics: PerformanceMetric[] = [];
  private featureUsage: Map<string, FeatureUsage> = new Map();
  private errorMetrics: Map<string, ErrorMetric> = new Map();
  private userFlows: Array<{ flow: string; startTime: number; endTime?: number }> = [];

  /**
   * Track performance metric
   */
  trackPerformance(name: string, value: number, unit: string = 'ms', metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    this.performanceMetrics.push(metric);

    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics.shift();
    }

    // Send to backend if available
    try {
      ipc.telemetry?.trackPerf?.(name, Math.round(value));
    } catch {
      // IPC not available
    }

    console.log(`[Telemetry] ${name}: ${value}${unit}`);
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, metadata?: Record<string, any>): void {
    const existing = this.featureUsage.get(feature);
    const usage: FeatureUsage = {
      feature,
      count: (existing?.count || 0) + 1,
      lastUsed: Date.now(),
      metadata,
    };

    this.featureUsage.set(feature, usage);

    // Send to analytics
    try {
      import('../lib/monitoring/analytics-client').then((module) => {
        if (module.trackAnalyticsEvent) {
          module.trackAnalyticsEvent('feature_used', { feature, ...metadata });
        }
      });
    } catch {
      // Analytics not available
    }
  }

  /**
   * Track error
   */
  trackError(error: string, context?: Record<string, any>): void {
    const existing = this.errorMetrics.get(error);
    const errorMetric: ErrorMetric = {
      error,
      count: (existing?.count || 0) + 1,
      firstSeen: existing?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      context,
    };

    this.errorMetrics.set(error, errorMetric);

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(error), {
        contexts: { custom: context },
      });
    }
  }

  /**
   * Track user flow
   */
  startFlow(flow: string): string {
    const flowId = `flow-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.userFlows.push({
      flow,
      startTime: Date.now(),
    });
    return flowId;
  }

  endFlow(flowId: string): void {
    const flow = this.userFlows.find(f => f.flow === flowId);
    if (flow) {
      flow.endTime = Date.now();
      const duration = flow.endTime - flow.startTime;
      this.trackPerformance(`flow_${flow.flow}`, duration, 'ms');
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    performance: PerformanceMetric[];
    features: FeatureUsage[];
    errors: ErrorMetric[];
    flows: Array<{ flow: string; duration: number }>;
  } {
    return {
      performance: [...this.performanceMetrics],
      features: Array.from(this.featureUsage.values()),
      errors: Array.from(this.errorMetrics.values()),
      flows: this.userFlows
        .filter(f => f.endTime)
        .map(f => ({
          flow: f.flow,
          duration: (f.endTime || 0) - f.startTime,
        })),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.performanceMetrics = [];
    this.featureUsage.clear();
    this.errorMetrics.clear();
    this.userFlows = [];
  }
}

export const telemetryMetrics = new TelemetryMetrics();

