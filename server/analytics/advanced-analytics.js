// server/analytics/advanced-analytics.js
// Advanced Analytics: event-driven metrics, stats, and insights for Regen

const eventBus = require('../eventBus');
const os = require('os');

// In-memory metrics store (replace with Prometheus/DB for prod)
const metrics = {
  jobs: 0,
  jobFailures: 0,
  agentTasks: 0,
  agentFailures: 0,
  skillExecutions: 0,
  users: 0,
  sessions: 0,
  distributedTasks: 0,
  edgeInferences: 0,
};

// Listen for events and update metrics
[
  ['job:created', () => metrics.jobs++],
  ['job:failed', () => metrics.jobFailures++],
  ['agent:task', () => metrics.agentTasks++],
  ['agent:failed', () => metrics.agentFailures++],
  ['skill:executed', () => metrics.skillExecutions++],
  ['user:registered', () => metrics.users++],
  ['session:created', () => metrics.sessions++],
  ['agent:task:broadcast', () => metrics.distributedTasks++],
  ['edge:inference', () => metrics.edgeInferences++],
].forEach(([evt, fn]) => eventBus.on(evt, fn));

// API: get current metrics
function getMetrics() {
  return { ...metrics, host: os.hostname(), timestamp: Date.now() };
}

// Optionally, emit metrics snapshot on interval
setInterval(() => {
  eventBus.emit('metrics:snapshot', getMetrics());
}, 5000);

module.exports = { getMetrics };
