/**
 * Enhanced Logger with Pino
 * Structured logging with rotation
 */

import pino from 'pino';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';

const logDir = join(app.getPath('userData'), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logFile = join(logDir, `omnibrowser-${new Date().toISOString().split('T')[0]}.log`);

// Create pino logger
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: { destination: logFile },
        level: 'info',
      },
      ...(process.env.NODE_ENV !== 'production'
        ? [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
              level: 'debug',
            },
          ]
        : []),
    ],
  },
});

/**
 * Log rotation - keep last 7 days
 */
export function rotateLogs() {
  try {
    const files = readdirSync(logDir);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      if (file.startsWith('omnibrowser-') && file.endsWith('.log')) {
        const filePath = join(logDir, file);
        try {
          const stats = statSync(filePath);
          if (now - stats.mtimeMs > sevenDays) {
            unlinkSync(filePath);
            logger.info({ file }, 'Deleted old log file');
          }
        } catch {
          // File might have been deleted, ignore
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to rotate logs');
  }
}

// Run rotation on startup
rotateLogs();

// Run rotation daily
setInterval(rotateLogs, 24 * 60 * 60 * 1000);

/**
 * Create a scoped logger
 */
export function createLogger(scope: string) {
  return logger.child({ scope });
}
