/**
 * Log Rotation Service
 * Manages log file rotation to prevent disk space issues
 */

import { existsSync, statSync, unlinkSync, renameSync } from 'fs';
import { createLogger } from './logger';

const log = createLogger('log-rotation');

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_LOG_FILES = 5; // Keep 5 rotated logs

/**
 * Rotate log file if it exceeds size limit
 */
export function rotateLogIfNeeded(logPath: string): void {
  try {
    if (!existsSync(logPath)) {
      return;
    }

    const stats = statSync(logPath);
    if (stats.size < MAX_LOG_SIZE) {
      return; // No rotation needed
    }

    // Rotate existing logs
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldPath = `${logPath}.${i}`;
      const newPath = `${logPath}.${i + 1}`;

      if (existsSync(oldPath)) {
        if (i === MAX_LOG_FILES - 1) {
          // Delete oldest log
          unlinkSync(oldPath);
        } else {
          renameSync(oldPath, newPath);
        }
      }
    }

    // Rotate current log
    renameSync(logPath, `${logPath}.1`);
    log.info('Log rotated', { logPath, size: stats.size });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to rotate log', { logPath, error: err.message });
  }
}

/**
 * Initialize log rotation for a log file
 */
export function initializeLogRotation(logPath: string): void {
  // Check on startup
  rotateLogIfNeeded(logPath);

  // Check every hour
  setInterval(
    () => {
      rotateLogIfNeeded(logPath);
    },
    60 * 60 * 1000
  );
}
