/**
 * Centralized error reporting hook
 * Provides consistent error handling and user feedback across the app
 */
export interface AppErrorOptions {
    /** Show error to user via toast */
    showToUser?: boolean;
    /** Log to console */
    logToConsole?: boolean;
    /** Additional context for logging */
    context?: Record<string, unknown>;
    /** Fallback value to return */
    fallback?: unknown;
}
export declare function useAppError(): {
    showError: (message: string, error?: unknown, options?: AppErrorOptions) => unknown;
    handleError: (error: unknown, context?: string, options?: AppErrorOptions) => unknown;
    safeExecute: <T>(fn: () => Promise<T>, fallback: T, context?: string) => Promise<T>;
};
