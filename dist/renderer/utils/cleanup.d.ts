/**
 * Cleanup utilities for memory leak prevention
 * DAY 5-6 FIX: Ensures proper cleanup of timers, listeners, and subscriptions
 */
export declare class CleanupManager {
    private timers;
    private intervals;
    private listeners;
    private abortControllers;
    /**
     * Track a timeout for cleanup
     */
    setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
    /**
     * Track an interval for cleanup
     */
    setInterval(callback: () => void, delay: number): ReturnType<typeof setInterval>;
    /**
     * Track an event listener for cleanup
     */
    addEventListener(element: EventTarget, event: string, handler: EventListener, options?: boolean | AddEventListenerOptions): void;
    /**
     * Track an AbortController for cleanup
     */
    addAbortController(controller: AbortController): AbortController;
    /**
     * Clear a specific timeout
     */
    clearTimeout(timer: ReturnType<typeof setTimeout>): void;
    /**
     * Clear a specific interval
     */
    clearInterval(interval: ReturnType<typeof setInterval>): void;
    /**
     * Remove a specific event listener
     */
    removeEventListener(element: EventTarget, event: string, handler: EventListener): void;
    /**
     * Abort a specific controller
     */
    abort(controller: AbortController): void;
    /**
     * Clean up all tracked resources
     */
    cleanup(): void;
}
/**
 * React hook for automatic cleanup
 */
export declare function useCleanup(): () => void;
