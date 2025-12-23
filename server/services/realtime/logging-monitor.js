// server/services/realtime/logging-monitor.js
// Event-driven logging and monitoring for Regen Backend

const eventBus = require('../../eventBus');
const fs = require('fs');
const path = require('path');

// Log file path (rotate in production)
const LOG_FILE = path.resolve(__dirname, '../../../logs/runtime-events.log');

// Ensure logs directory exists
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

// Simple log appender
function appendLog(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

// Listen for all runtime events and log them
[
  'job:created',
  'job:started',
  'job:progress',
  'job:completed',
  'job:failed',
  'job:checkpointed',
  'job:cancelled',
  'agent:registered',
  'agent:started',
  'agent:stopped',
  'agent:failed',
  'memory:changed',
  'memory:added',
  'memory:removed',
  'skill:loaded',
  'skill:unloaded',
  'skill:failed',
  'session:created',
  'session:validated',
  'session:invalid',
  'session:destroyed',
  'user:registered',
  'user:session',
  'user:login',
  'user:logout',
  'runtime:error',
].forEach(evt => {
  eventBus.on(evt, payload => {
    const entry = {
      event: evt,
      payload,
      timestamp: new Date().toISOString(),
    };
    appendLog(entry);
  });
});

// API: get recent logs
function getRecentLogs(limit = 100) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
  return lines
    .slice(-limit)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = {
  getRecentLogs,
};
