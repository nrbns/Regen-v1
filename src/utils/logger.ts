/**
 * Centralized Logging - Tier 1
 * Wrapper for console logs with consistent formatting
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private prefix = '[OMNI]';

  private formatMessage(level: LogLevel, ..._args: unknown[]): string {
    const timestamp = new Date().toISOString();
    return `${this.prefix} [${timestamp}] [${level.toUpperCase()}]`;
  }

  info(...args: unknown[]) {
    console.log(this.formatMessage('info'), ...args);
  }

  warn(...args: unknown[]) {
    console.warn(this.formatMessage('warn'), ...args);
  }

  error(...args: unknown[]) {
    console.error(this.formatMessage('error'), ...args);
  }

  debug(...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug'), ...args);
    }
  }
}

export const log = new Logger();
