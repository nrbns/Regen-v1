/**
 * PERFORMANCE FIX #6: Comprehensive performance logging
 * Tracks latency, errors, and bottlenecks across all services
 */

const Pino = require('pino');

const logger = Pino({
  name: 'performance',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

class PerformanceLogger {
  constructor() {
    this.metrics = new Map(); // key -> { count, totalLatency, min, max, errors }
    this.activeTimers = new Map(); // key -> startTime
  }

  /**
   * Start timing an operation
   */
  start(label, metadata = {}) {
    const key = this._getKey(label, metadata);
    this.activeTimers.set(key, Date.now());
    return key;
  }

  /**
   * End timing and record metric
   */
  end(key, success = true, error = null) {
    const startTime = this.activeTimers.get(key);
    if (!startTime) {
      logger.warn({ key }, 'Timer not found');
      return;
    }

    const latency = Date.now() - startTime;
    this.activeTimers.delete(key);

    const metric = this.metrics.get(key) || {
      count: 0,
      totalLatency: 0,
      min: Infinity,
      max: 0,
      errors: 0,
      lastError: null,
    };

    metric.count++;
    metric.totalLatency += latency;
    metric.min = Math.min(metric.min, latency);
    metric.max = Math.max(metric.max, latency);

    if (!success || error) {
      metric.errors++;
      metric.lastError = error?.message || 'Unknown error';
      logger.error({ key, latency, error: error?.message }, 'Operation failed');
    } else {
      // Log slow operations
      if (latency > 1000) {
        logger.warn({ key, latency }, 'Slow operation detected');
      } else if (process.env.LOG_PERFORMANCE !== '0') {
        logger.debug({ key, latency }, 'Operation completed');
      }
    }

    this.metrics.set(key, metric);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const result = {};
    for (const [key, metric] of this.metrics.entries()) {
      result[key] = {
        count: metric.count,
        avgLatency: metric.totalLatency / metric.count,
        minLatency: metric.min === Infinity ? 0 : metric.min,
        maxLatency: metric.max,
        errorRate: (metric.errors / metric.count) * 100,
        lastError: metric.lastError,
      };
    }
    return result;
  }

  /**
   * Get key for metric
   */
  _getKey(label, metadata) {
    const parts = [label];
    if (metadata.service) parts.push(`service:${metadata.service}`);
    if (metadata.endpoint) parts.push(`endpoint:${metadata.endpoint}`);
    return parts.join('|');
  }

  /**
   * Log performance summary
   */
  logSummary() {
    const metrics = this.getMetrics();
    logger.info({ metrics }, 'Performance summary');
  }
}

// Singleton instance
let instance = null;

function getPerformanceLogger() {
  if (!instance) {
    instance = new PerformanceLogger();
  }
  return instance;
}

module.exports = { getPerformanceLogger };








