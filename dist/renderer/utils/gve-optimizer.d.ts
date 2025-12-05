/**
 * GVE (Global View Engine) Optimizer
 * Performance optimizations to eliminate lag and handle iframes efficiently
 * Target: 2x faster than Comet's cloud
 */
/**
 * View update throttler - limits updates to 60fps
 */
export declare const throttleViewUpdate: import("lodash").DebouncedFuncLeading<(callback: () => void) => void>;
/**
 * Debounced view resize handler
 */
export declare const debounceResize: import("lodash").DebouncedFunc<(callback: () => void) => void>;
/**
 * Iframe isolation manager
 * Handles iframe loading, communication, and performance
 */
export declare class IframeManager {
    private iframes;
    private observers;
    private messageHandlers;
    /**
     * Register iframe with optimizations
     */
    registerIframe(id: string, iframe: HTMLIFrameElement, options?: {
        lazy?: boolean;
        sandbox?: string[];
        allow?: string;
    }): void;
    /**
     * Handle iframe resize efficiently
     */
    private handleIframeResize;
    /**
     * Handle iframe messages
     */
    private handleIframeMessage;
    /**
     * Unregister iframe
     */
    unregisterIframe(id: string): void;
    /**
     * Get iframe by ID
     */
    getIframe(id: string): HTMLIFrameElement | undefined;
    /**
     * Send message to iframe
     */
    postMessage(id: string, message: any, targetOrigin?: string): void;
}
export declare function getIframeManager(): IframeManager;
/**
 * View renderer with performance optimizations
 */
export declare class OptimizedViewRenderer {
    private renderQueue;
    private isRendering;
    private frameId;
    /**
     * Queue a render operation
     */
    queueRender(callback: () => void): void;
    /**
     * Schedule next render frame
     */
    private scheduleRender;
    /**
     * Flush render queue
     */
    private flushRenderQueue;
    /**
     * Cancel pending renders
     */
    cancel(): void;
}
export declare function getViewRenderer(): OptimizedViewRenderer;
/**
 * Performance monitor
 */
export declare class PerformanceMonitor {
    private metrics;
    /**
     * Start timing
     */
    start(label: string): () => void;
    /**
     * Get average time for label
     */
    getAverage(label: string): number;
    /**
     * Get all metrics
     */
    getMetrics(): Record<string, {
        avg: number;
        count: number;
    }>;
}
export declare function getPerformanceMonitor(): PerformanceMonitor;
