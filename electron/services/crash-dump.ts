/**
 * Crash Dump Service
 * Captures crash information on fatal errors
 */

import { app, crashReporter } from 'electron';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createLogger } from './utils/logger';

const log = createLogger('crash-dump');

const CRASH_DIR = join(app.getPath('userData'), 'crashes');

/**
 * Initialize crash reporter
 */
export function initializeCrashReporter(): void {
  try {
    mkdirSync(CRASH_DIR, { recursive: true });

    crashReporter.start({
      productName: 'OmniBrowser',
      companyName: 'OmniBrowser',
      submitURL: '', // No remote submission
      uploadToServer: false,
      compress: true,
    });

    log.info('Crash reporter initialized', { crashDir: CRASH_DIR });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to initialize crash reporter', { error: err.message });
  }
}

/**
 * Write crash dump to file
 */
export function writeCrashDump(error: Error, context?: Record<string, unknown>): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpPath = join(CRASH_DIR, `crash-${timestamp}.json`);

    const dump = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node,
        memoryUsage: process.memoryUsage(),
        ...context,
      },
    };

    writeFileSync(dumpPath, JSON.stringify(dump, null, 2), 'utf8');
    log.error('Crash dump written', { dumpPath });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error('Failed to write crash dump', { error: error.message });
  }
}

/**
 * Setup global error handlers
 */
export function setupCrashHandlers(): void {
  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    log.error('Uncaught exception', { error: error.message, stack: error.stack });
    writeCrashDump(error, { type: 'uncaughtException' });
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    log.error('Unhandled rejection', { error: error.message, stack: error.stack });
    writeCrashDump(error, { type: 'unhandledRejection' });
  });
}
