/**
 * Centralized Logging - Tier 1
 * Wrapper for console logs with consistent formatting
 */
declare class Logger {
    private prefix;
    private formatMessage;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    debug(...args: unknown[]): void;
}
export declare const log: Logger;
export {};
