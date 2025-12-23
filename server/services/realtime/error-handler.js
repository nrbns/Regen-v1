// server/services/realtime/error-handler.js
// Centralized, event-driven error and exception handler for production hardening

const eventBus = require('../../eventBus');
const { initSentry } = require('../../monitoring/sentry');

// Initialize Sentry if configured
const sentryDsn = process.env.SENTRY_DSN;
const sentryEnv = process.env.NODE_ENV || 'production';
let sentry = null;
if (sentryDsn) {
  sentry = initSentry({ dsn: sentryDsn, environment: sentryEnv });
}

// Listen for all error events on the event bus
['job:failed', 'agent:failed', 'memory:error', 'skill:failed'].forEach(evt => {
  eventBus.on(evt, payload => {
    if (sentry) {
      sentry.captureExecutionError(
        payload.id || 'unknown',
        new Error(payload.error || payload.message || 'Unknown error'),
        {
          userId: payload.userId || 'unknown',
          agentType: payload.agentType || 'unknown',
          taskCount: payload.taskCount || 0,
          taskId: payload.taskId || undefined,
        }
      );
    }
    // Optionally, broadcast error to all clients
    eventBus.emit('runtime:error', payload);
  });
});

// Global process-level error handling
process.on('uncaughtException', err => {
  console.error('[Global] Uncaught Exception:', err);
  if (sentry) sentry.captureException(err);
  eventBus.emit('runtime:error', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error('[Global] Unhandled Rejection:', reason);
  if (sentry) sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  eventBus.emit('runtime:error', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
});

// Optionally export error handling utilities here
