import { createWriteStream, type WriteStream } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { initializeLogRotation, rotateLogIfNeeded } from './log-rotation';

// Use app logs directory instead of temp
const LOG_FILE = join(app.getPath('logs'), 'omnibrowser.log');

let stream: WriteStream | null = null;
try {
  // Initialize log rotation
  initializeLogRotation(LOG_FILE);
  rotateLogIfNeeded(LOG_FILE);

  stream = createWriteStream(LOG_FILE, { flags: 'a' });
} catch (error) {
  console.warn('[logger] Failed to create log stream', error);
  stream = null;
}

const format = (level: string, scope: string, message: string, meta?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const base = `${timestamp}\t${level.toUpperCase()}\t${scope}\t${message}`;
  if (!meta || Object.keys(meta).length === 0) {
    return `${base}\n`;
  }
  return `${base}\t${JSON.stringify(meta)}\n`;
};

const write = (
  level: 'info' | 'warn' | 'error',
  scope: string,
  message: string,
  meta?: Record<string, unknown>
) => {
  const line = format(level, scope, message, meta);
  if (stream) {
    stream.write(line);
  }
  if (process.env.NODE_ENV !== 'production') {
    const consoleFn =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(`[${scope}] ${message}`, meta ?? '');
  }
};

export function createLogger(scope: string) {
  return {
    info(message: string, meta?: Record<string, unknown>) {
      write('info', scope, message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>) {
      write('warn', scope, message, meta);
    },
    error(message: string, meta?: Record<string, unknown>) {
      write('error', scope, message, meta);
    },
    debug(message: string, meta?: Record<string, unknown>) {
      // Debug logs only in development
      if (process.env.NODE_ENV !== 'production') {
        write('info', scope, message, meta);
      }
    },
  };
}
