/**
 * useOptimizedView Hook
 * React hook for optimized view rendering with GVE performance improvements
 */
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { getIframeManager, getViewRenderer, getPerformanceMonitor } from '../utils/gve-optimizer';
import { debounceResize } from '../utils/gve-optimizer';
export function useOptimizedView(options = {}) {
    const { iframeId, lazy = true, sandbox, onResize, onMessage, } = options;
    const iframeRef = useRef(null);
    const renderer = useMemo(() => getViewRenderer(), []);
    const monitor = useMemo(() => getPerformanceMonitor(), []);
    /**
     * Register iframe with optimizations
     */
    useEffect(() => {
        if (iframeId && iframeRef.current) {
            const iframeManager = getIframeManager();
            iframeManager.registerIframe(iframeId, iframeRef.current, {
                lazy,
                sandbox: sandbox || ['allow-scripts', 'allow-same-origin'],
                allow: 'clipboard-read; clipboard-write',
            });
            return () => {
                iframeManager.unregisterIframe(iframeId);
            };
        }
    }, [iframeId, lazy, sandbox]);
    /**
     * Handle resize events
     */
    useEffect(() => {
        if (!onResize)
            return;
        const handler = (event) => {
            if (event.detail.id === iframeId) {
                const rect = event.detail.rect;
                onResize(rect);
            }
        };
        window.addEventListener('iframe-resize', handler);
        return () => {
            window.removeEventListener('iframe-resize', handler);
        };
    }, [iframeId, onResize]);
    /**
     * Handle iframe messages
     */
    useEffect(() => {
        if (!onMessage)
            return;
        const handler = (event) => {
            if (event.detail.id === iframeId) {
                onMessage(event.detail.data);
            }
        };
        window.addEventListener('iframe-message', handler);
        return () => {
            window.removeEventListener('iframe-message', handler);
        };
    }, [iframeId, onMessage]);
    /**
     * Queue render update
     */
    const queueUpdate = useCallback((callback) => {
        const endTiming = monitor.start('view-update');
        renderer.queueRender(() => {
            callback();
            endTiming();
        });
    }, [renderer, monitor]);
    /**
     * Optimized resize handler
     */
    const handleResize = useCallback(() => {
        debounceResize(() => {
            if (iframeRef.current) {
                const rect = iframeRef.current.getBoundingClientRect();
                onResize?.(rect);
            }
        });
    }, [onResize]);
    /**
     * Setup window resize listener
     */
    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [handleResize]);
    return {
        iframeRef,
        queueUpdate,
        getMetrics: () => monitor.getMetrics(),
    };
}
