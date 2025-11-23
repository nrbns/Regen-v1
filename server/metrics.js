/**
 * Metrics Endpoint
 * Exposes system metrics for monitoring
 */

// Metrics storage
const metrics = {
  uptime: Date.now(),
  memory: process.memoryUsage(),
  performance: {
    tabCreation: [],
    ipcLatency: [],
    agentExecution: [],
  },
  counts: {
    tabs: 0,
    agents: 0,
    workers: 0,
  },
};

/**
 * Record a performance metric
 */
function recordMetric(type, value) {
  if (!metrics.performance[type]) {
    metrics.performance[type] = [];
  }
  metrics.performance[type].push(value);

  // Keep only last 100 measurements
  if (metrics.performance[type].length > 100) {
    metrics.performance[type] = metrics.performance[type].slice(-100);
  }
}

/**
 * Get current metrics
 */
function getMetrics() {
  const memUsage = process.memoryUsage();

  // Calculate averages
  const avgTabCreation =
    metrics.performance.tabCreation.length > 0
      ? metrics.performance.tabCreation.reduce((a, b) => a + b, 0) /
        metrics.performance.tabCreation.length
      : 0;

  const avgIpcLatency =
    metrics.performance.ipcLatency.length > 0
      ? metrics.performance.ipcLatency.reduce((a, b) => a + b, 0) /
        metrics.performance.ipcLatency.length
      : 0;

  const avgAgentExecution =
    metrics.performance.agentExecution.length > 0
      ? metrics.performance.agentExecution.reduce((a, b) => a + b, 0) /
        metrics.performance.agentExecution.length
      : 0;

  return {
    ...metrics,
    uptime: Date.now() - metrics.uptime,
    memory: memUsage,
    averages: {
      tabCreation: Math.round(avgTabCreation * 100) / 100,
      ipcLatency: Math.round(avgIpcLatency * 100) / 100,
      agentExecution: Math.round(avgAgentExecution * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Update memory metrics
 */
function updateMemory() {
  metrics.memory = process.memoryUsage();
}

// Update memory every 5 seconds
setInterval(updateMemory, 5000);

module.exports = {
  recordMetric,
  getMetrics,
  updateCounts: counts => {
    metrics.counts = { ...metrics.counts, ...counts };
  },
};
