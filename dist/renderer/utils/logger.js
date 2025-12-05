/**
 * Centralized Logging - Tier 1
 * Wrapper for console logs with consistent formatting
 */
class Logger {
    prefix = '[OMNI]';
    formatMessage(level, ..._args) {
        const timestamp = new Date().toISOString();
        return `${this.prefix} [${timestamp}] [${level.toUpperCase()}]`;
    }
    info(...args) {
        console.log(this.formatMessage('info'), ...args);
    }
    warn(...args) {
        console.warn(this.formatMessage('warn'), ...args);
    }
    error(...args) {
        console.error(this.formatMessage('error'), ...args);
    }
    debug(...args) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.formatMessage('debug'), ...args);
        }
    }
}
export const log = new Logger();
