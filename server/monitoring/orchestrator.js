/**
 * Orchestrator Monitoring (runtime JS)
 */

class OrchestratorMonitoring {
  constructor() {
    this.metrics = [];
    this.errors = [];
    this.usage = [];
    this.maxItems = 1000;
  }

  trackPerformance(metric) {
    this.metrics.push({ ...metric, timestamp: new Date() });
    if (this.metrics.length > this.maxItems) this.metrics.shift();
  }

  trackError(event) {
    this.errors.push({ ...event, timestamp: new Date() });
    if (this.errors.length > this.maxItems) this.errors.shift();
  }

  trackUsage(event) {
    this.usage.push({ ...event, timestamp: new Date() });
    if (this.usage.length > this.maxItems) this.usage.shift();
  }

  #percentile(values, p) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return sorted[idx];
  }

  getPerformanceStats(component) {
    const items = component ? this.metrics.filter((m) => m.component === component) : this.metrics;
    const count = items.length;
    const durations = items.map((m) => m.durationMs);
    const successCount = items.filter((m) => m.success).length;
    const avgDurationMs = count ? durations.reduce((a, b) => a + b, 0) / count : 0;
    return {
      count,
      avgDurationMs,
      p50: this.#percentile(durations, 0.5),
      p95: this.#percentile(durations, 0.95),
      p99: this.#percentile(durations, 0.99),
      successRate: count ? (successCount / count) * 100 : 0,
    };
  }

  getErrorStats() {
    const total = this.errors.length;
    const byComponent = {};
    for (const e of this.errors) {
      byComponent[e.component] = (byComponent[e.component] || 0) + 1;
    }
    return { total, byComponent, recent: this.errors.slice(-10) };
  }

  getUsageStats() {
    const total = this.usage.length;
    const byAgent = {};
    const byUser = {};
    let success = 0;
    for (const u of this.usage) {
      if (u.agent) byAgent[u.agent] = (byAgent[u.agent] || 0) + 1;
      if (u.userId) byUser[u.userId] = (byUser[u.userId] || 0) + 1;
      if (u.success) success++;
    }
    return { total, byAgent, byUser, successRate: total ? (success / total) * 100 : 0 };
  }

  getHealth() {
    const perf = this.getPerformanceStats();
    const errors = this.getErrorStats();
    const checks = {
      performance: perf.p95 < 5000,
      successRate: perf.successRate > 90,
      errorRate: errors.total < 100,
    };
    const status = checks.performance && checks.successRate && checks.errorRate
      ? 'healthy'
      : checks.performance || checks.successRate
      ? 'degraded'
      : 'unhealthy';
    return { status, checks, metrics: { perf, errors } };
  }
}

let monitoringInstance = null;
export function getMonitoring() {
  if (!monitoringInstance) monitoringInstance = new OrchestratorMonitoring();
  return monitoringInstance;
}

export function trackRouterPerformance(durationMs, success, metadata = {}) {
  getMonitoring().trackPerformance({ component: 'router', durationMs, success, ...metadata });
}
export function trackPlannerPerformance(durationMs, success, metadata = {}) {
  getMonitoring().trackPerformance({ component: 'planner', durationMs, success, ...metadata });
}
export function trackExecutorPerformance(durationMs, success, metadata = {}) {
  getMonitoring().trackPerformance({ component: 'executor', durationMs, success, ...metadata });
}
export function trackOrchestratorError(component, error, context = {}) {
  getMonitoring().trackError({ component, error: error?.message || String(error), context });
}

export default OrchestratorMonitoring;
