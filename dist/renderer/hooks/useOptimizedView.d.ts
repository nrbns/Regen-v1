/**
 * useOptimizedView Hook
 * React hook for optimized view rendering with GVE performance improvements
 */
interface UseOptimizedViewOptions {
    iframeId?: string;
    lazy?: boolean;
    sandbox?: string[];
    onResize?: (rect: DOMRect) => void;
    onMessage?: (data: any) => void;
}
export declare function useOptimizedView(options?: UseOptimizedViewOptions): {
    iframeRef: import("react").MutableRefObject<HTMLIFrameElement | null>;
    queueUpdate: (callback: () => void) => void;
    getMetrics: () => Record<string, {
        avg: number;
        count: number;
    }>;
};
export {};
