/**
 * Metrics Collection - Tier 2
 * Performance timings, scrape metrics, AI agent execution traces
 */
import { log } from '../../utils/logger';
export class MetricsCollector {
    metrics = [];
    scrapeMetrics = [];
    agentMetrics = [];
    maxMetrics = 1000;
    /**
     * Record a metric
     */
    record(name, value, unit = 'ms', tags) {
        const metric = {
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
    recordScrape(metric) {
        this.scrapeMetrics.push(metric);
        if (this.scrapeMetrics.length > this.maxMetrics) {
            this.scrapeMetrics.shift();
        }
        log.debug('Scrape metric recorded', metric);
    }
    /**
     * Record agent metric
     */
    recordAgent(metric) {
        this.agentMetrics.push(metric);
        if (this.agentMetrics.length > this.maxMetrics) {
            this.agentMetrics.shift();
        }
        log.debug('Agent metric recorded', metric);
    }
    /**
     * Get metrics by name
     */
    getMetrics(name, tags) {
        let filtered = this.metrics;
        if (name) {
            filtered = filtered.filter(m => m.name === name);
        }
        if (tags) {
            filtered = filtered.filter(m => {
                if (!m.tags)
                    return false;
                return Object.entries(tags).every(([key, value]) => m.tags[key] === value);
            });
        }
        return filtered;
    }
    /**
     * Get scrape metrics
     */
    getScrapeMetrics() {
        return [...this.scrapeMetrics];
    }
    /**
     * Get agent metrics
     */
    getAgentMetrics() {
        return [...this.agentMetrics];
    }
    /**
     * Get summary statistics
     */
    getSummary() {
        const scrapeAvg = this.scrapeMetrics.length > 0
            ? this.scrapeMetrics.reduce((sum, m) => sum + m.duration, 0) / this.scrapeMetrics.length
            : 0;
        const agentAvg = this.agentMetrics.length > 0
            ? this.agentMetrics.reduce((sum, m) => sum + m.duration, 0) / this.agentMetrics.length
            : 0;
        const agentSuccessRate = this.agentMetrics.length > 0
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
    clear() {
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
export function timeFunction(name, fn) {
    const start = performance.now();
    return Promise.resolve(fn()).then(result => {
        const duration = performance.now() - start;
        metricsCollector.record(name, duration, 'ms');
        return result;
    }, error => {
        const duration = performance.now() - start;
        metricsCollector.record(`${name}:error`, duration, 'ms', { error: String(error) });
        throw error;
    });
}
