/**
 * Orchestrator Monitoring Service
 * Tracks performance metrics, errors, and usage patterns
 */

// Types imported for use by consumers of this module
export type { IntentClassification } from '../../services/agentOrchestrator/intentRouter.js';
export type { ExecutionPlan } from '../../services/agentOrchestrator/planner.js';
export type { ExecutionResult } from '../../services/agentOrchestrator/executor.js';

export interface PerformanceMetric {
  component: 'router' | 'planner' | 'executor' | 'api';
  operation: string;
  durationMs: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorEvent {
  component: string;
  error: Error;
  context: Record<string, any>;
  timestamp: Date;
  userId?: string;
  planId?: string;
}

export interface UsageEvent {
  userId: string;
  agent: string;
  action: string;
  timestamp: Date;
  success: boolean;
  durationMs: number;
}

export class OrchestratorMonitoring {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private usage: UsageEvent[] = [];
  private maxStoredMetrics = 1000;

  /**
   * Track performance metric
   */
  trackPerformance(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (metric.durationMs > 5000) {
      console.warn(
        `[Monitoring] Slow operation detected: ${metric.component}.${metric.operation} took ${metric.durationMs}ms`
      );
    }
  }

  /**
   * Track error
   */
  trackError(event: ErrorEvent): void {
    this.errors.push(event);

    // Keep only recent errors
    if (this.errors.length > this.maxStoredMetrics) {
      this.errors.shift();
    }

    console.error(`[Monitoring] Error in ${event.component}:`, event.error.message, event.context);
  }

  /**
   * Track usage
   */
  trackUsage(event: UsageEvent): void {
    this.usage.push(event);

    // Keep only recent usage
    if (this.usage.length > this.maxStoredMetrics) {
      this.usage.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(component?: string): {
    count: number;
    avgDurationMs: number;
    p50: number;
    p95: number;
    p99: number;
    successRate: number;
  } {
    let filtered = this.metrics;
    if (component) {
      filtered = filtered.filter(m => m.component === component);
    }

    if (filtered.length === 0) {
      return { count: 0, avgDurationMs: 0, p50: 0, p95: 0, p99: 0, successRate: 0 };
    }

    const durations = filtered.map(m => m.durationMs).sort((a, b) => a - b);
    const successCount = filtered.filter(m => m.success).length;

    return {
      count: filtered.length,
      avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      successRate: successCount / filtered.length,
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byComponent: Record<string, number>;
    recent: ErrorEvent[];
  } {
    const byComponent: Record<string, number> = {};

    this.errors.forEach(e => {
      byComponent[e.component] = (byComponent[e.component] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byComponent,
      recent: this.errors.slice(-10),
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    total: number;
    byAgent: Record<string, number>;
    byUser: Record<string, number>;
    successRate: number;
  } {
    const byAgent: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const successCount = this.usage.filter(u => u.success).length;

    this.usage.forEach(u => {
      byAgent[u.agent] = (byAgent[u.agent] || 0) + 1;
      byUser[u.userId] = (byUser[u.userId] || 0) + 1;
    });

    return {
      total: this.usage.length,
      byAgent,
      byUser,
      successRate: this.usage.length > 0 ? successCount / this.usage.length : 0,
    };
  }

  /**
   * Get health status
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: any;
  } {
    const routerStats = this.getPerformanceStats('router');
    const plannerStats = this.getPerformanceStats('planner');
    const executorStats = this.getPerformanceStats('executor');
    const errorStats = this.getErrorStats();

    const checks = {
      routerPerformance: routerStats.avgDurationMs < 100,
      plannerPerformance: plannerStats.avgDurationMs < 5000,
      executorSuccess: executorStats.successRate > 0.95,
      lowErrorRate: this.errors.length < 100,
    };

    const healthy = Object.values(checks).every(v => v);
    const degraded = Object.values(checks).filter(v => v).length >= 2;

    return {
      status: healthy ? 'healthy' : degraded ? 'degraded' : 'unhealthy',
      checks,
      metrics: {
        router: routerStats,
        planner: plannerStats,
        executor: executorStats,
        errors: errorStats.total,
      },
    };
  }

  /**
   * Clear old data
   */
  clearOldData(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
    this.usage = this.usage.filter(u => u.timestamp > cutoff);

    console.log(`[Monitoring] Cleared data older than ${olderThanHours} hours`);
  }

  /**
   * Export metrics for external monitoring (Datadog, New Relic, etc.)
   */
  exportMetrics(): {
    performance: PerformanceMetric[];
    errors: ErrorEvent[];
    usage: UsageEvent[];
    timestamp: Date;
  } {
    return {
      performance: [...this.metrics],
      errors: [...this.errors],
      usage: [...this.usage],
      timestamp: new Date(),
    };
  }
}

// Singleton instance
let monitoringInstance: OrchestratorMonitoring | null = null;

export function getMonitoring(): OrchestratorMonitoring {
  if (!monitoringInstance) {
    monitoringInstance = new OrchestratorMonitoring();
  }
  return monitoringInstance;
}

// Helper functions for easy tracking
export function trackRouterPerformance(durationMs: number, success: boolean, metadata?: any): void {
  getMonitoring().trackPerformance({
    component: 'router',
    operation: 'classify',
    durationMs,
    timestamp: new Date(),
    success,
    metadata,
  });
}

export function trackPlannerPerformance(
  durationMs: number,
  success: boolean,
  metadata?: any
): void {
  getMonitoring().trackPerformance({
    component: 'planner',
    operation: 'create_plan',
    durationMs,
    timestamp: new Date(),
    success,
    metadata,
  });
}

export function trackExecutorPerformance(
  durationMs: number,
  success: boolean,
  metadata?: any
): void {
  getMonitoring().trackPerformance({
    component: 'executor',
    operation: 'execute_plan',
    durationMs,
    timestamp: new Date(),
    success,
    metadata,
  });
}

export function trackOrchestratorError(component: string, error: Error, context: any): void {
  getMonitoring().trackError({
    component,
    error,
    context,
    timestamp: new Date(),
    userId: context.userId,
    planId: context.planId,
  });
}

export default OrchestratorMonitoring;
