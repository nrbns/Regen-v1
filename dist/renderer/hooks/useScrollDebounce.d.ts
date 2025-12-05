/**
 * Hook for debounced scroll/resize handlers
 * Prevents excessive function calls and reduces CPU usage
 */
export declare function useScrollDebounce(handler: () => void, delay?: number, options?: {
    debounce?: boolean;
}): void;
