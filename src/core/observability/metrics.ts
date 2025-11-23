/**
 * Metrics Collection - Tier 2
 * Performance timings, scrape metrics, AI agent execution traces
 */

import { log } from '../../utils/logger';

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ScrapeMetric {
  url: string;
  duration: number;
  size: number;
  cached: boolean;
  timestamp: number;
}

export interface AgentMetric {
  agentId: string;
  runId: string;
  duration: number;
  tokensUsed?: number;
  success: boolean;
  timestamp: number;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private scrapeMetrics: ScrapeMetric[] = [];
  private agentMetrics: AgentMetric[] = [];
  private maxMetrics = 1000;

  /**
   * Record a metric
   */
  record(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Trim if over limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    log.debug('Metric recorded', metric);
  }

  /**
   * Record scrape metric
   */
  recordScrape(metric: ScrapeMetric): void {
    this.scrapeMetrics.push(metric);

    if (this.scrapeMetrics.length > this.maxMetrics) {
      this.scrapeMetrics.shift();
    }

    log.debug('Scrape metric recorded', metric);
  }

  /**
   * Record agent metric
   */
  recordAgent(metric: AgentMetric): void {
    this.agentMetrics.push(metric);

    if (this.agentMetrics.length > this.maxMetrics) {
      this.agentMetrics.shift();
    }

    log.debug('Agent metric recorded', metric);
  }

  /**
   * Get metrics by name
   */
  getMetrics(name?: string, tags?: Record<string, string>): Metric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (tags) {
      filtered = filtered.filter(m => {
        if (!m.tags) return false;
        return Object.entries(tags).every(([key, value]) => m.tags![key] === value);
      });
    }

    return filtered;
  }

  /**
   * Get scrape metrics
   */
  getScrapeMetrics(): ScrapeMetric[] {
    return [...this.scrapeMetrics];
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(): AgentMetric[] {
    return [...this.agentMetrics];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const scrapeAvg =
      this.scrapeMetrics.length > 0
        ? this.scrapeMetrics.reduce((sum, m) => sum + m.duration, 0) / this.scrapeMetrics.length
        : 0;

    const agentAvg =
      this.agentMetrics.length > 0
        ? this.agentMetrics.reduce((sum, m) => sum + m.duration, 0) / this.agentMetrics.length
        : 0;

    const agentSuccessRate =
      this.agentMetrics.length > 0
        ? this.agentMetrics.filter(m => m.success).length / this.agentMetrics.length
        : 0;

    return {
      totalMetrics: this.metrics.length,
      totalScrapes: this.scrapeMetrics.length,
      totalAgentRuns: this.agentMetrics.length,
      avgScrapeDuration: scrapeAvg,
      avgAgentDuration: agentAvg,
      agentSuccessRate,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.scrapeMetrics = [];
    this.agentMetrics = [];
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

/**
 * Performance timing helper
 */
export function timeFunction<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  const start = performance.now();
  return Promise.resolve(fn()).then(
    result => {
      const duration = performance.now() - start;
      metricsCollector.record(name, duration, 'ms');
      return result;
    },
    error => {
      const duration = performance.now() - start;
      metricsCollector.record(`${name}:error`, duration, 'ms', { error: String(error) });
      throw error;
    }
  );
}
