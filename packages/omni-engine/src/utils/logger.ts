/**
 * Simple logger utility
 */

export function createLogger(name: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(`[${name}] ${message}`, meta || '');
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(`[${name}] ERROR: ${message}`, meta || '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(`[${name}] WARN: ${message}`, meta || '');
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (process.env.DEBUG) {
        console.debug(`[${name}] DEBUG: ${message}`, meta || '');
      }
    },
  };
}
