#!/usr/bin/env node
/**
 * Standalone Plan Worker Process
 * 
 * Runs as a separate process to execute queued plans
 * 
 * Usage:
 *   node workers/plan-executor.js
 * 
 * Environment Variables:
 *   WORKER_CONCURRENCY=5     # Number of concurrent jobs (default: 5)
 *   REDIS_HOST=localhost     # Redis host
 *   REDIS_PORT=6379          # Redis port
 */

import { createPlanWorker, stopPlanWorker } from '../services/agentOrchestrator/workers/planWorker.js';
import { initializePlanStore } from '../services/agentOrchestrator/persistence/planStoreFactory.js';
import { initSentry } from '../server/monitoring/sentry.js';

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  console.log('\n🔄 Plan Execution Worker Starting...\n');

  try {
    // Initialize Sentry first
    if (SENTRY_DSN) {
      console.log('[Worker] Initializing Sentry...');
      const sentry = initSentry({
        dsn: SENTRY_DSN,
        environment: NODE_ENV,
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        releaseVersion: process.env.npm_package_version,
      });
      await sentry.initialize();
      console.log('[Worker] ✓ Sentry initialized');
    } else {
      console.log('[Worker] Sentry DSN not provided, error tracking disabled');
    }

    // Initialize PlanStore
    console.log('[Worker] Initializing PlanStore...');
    await initializePlanStore();
    console.log('[Worker] ✓ PlanStore initialized');

    // Start worker
    console.log(`[Worker] Starting worker with concurrency ${WORKER_CONCURRENCY}...`);
    createPlanWorker(WORKER_CONCURRENCY);
    console.log('[Worker] ✓ Worker started and listening for jobs');

    console.log('\n✅ Worker ready to process plans\n');
    console.log(`Concurrency: ${WORKER_CONCURRENCY}`);
    console.log(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
    console.log('\nPress Ctrl+C to stop\n');

  } catch (error) {
    console.error('\n❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n\n[Worker] Received ${signal}, shutting down gracefully...`);

  try {
    await stopPlanWorker();
    console.log('[Worker] ✓ Worker stopped');
    console.log('[Worker] Shutdown complete\n');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start
main();
