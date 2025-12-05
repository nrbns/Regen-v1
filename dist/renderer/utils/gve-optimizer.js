/**
 * GVE (Global View Engine) Optimizer
 * Performance optimizations to eliminate lag and handle iframes efficiently
 * Target: 2x faster than Comet's cloud
 */
import { debounce, throttle } from 'lodash-es';
/**
 * View update throttler - limits updates to 60fps
 */
export const throttleViewUpdate = throttle((callback) => {
    requestAnimationFrame(callback);
}, 16, // ~60fps
{ leading: true, trailing: true });
/**
 * Debounced view resize handler
 */
export const debounceResize = debounce((callback) => {
    callback();
}, 100 // 100ms debounce
);
/**
 * Iframe isolation manager
 * Handles iframe loading, communication, and performance
 */
export class IframeManager {
    iframes = new Map();
    observers = new Map();
    messageHandlers = new Map();
    /**
     * Register iframe with optimizations
     */
    registerIframe(id, iframe, options = {}) {
        // Apply sandbox for security
        if (options.sandbox) {
            iframe.setAttribute('sandbox', options.sandbox.join(' '));
        }
        // Apply allow policies
        if (options.allow) {
            iframe.setAttribute('allow', options.allow);
        }
        // Lazy loading
        if (options.lazy) {
            iframe.setAttribute('loading', 'lazy');
        }
        // Performance optimizations
        iframe.setAttribute('fetchpriority', 'low');
        iframe.style.contentVisibility = 'auto';
        iframe.style.contain = 'layout style paint';
        this.iframes.set(id, iframe);
        // Setup resize observer for efficient size tracking
        const observer = new ResizeObserver(() => {
            throttleViewUpdate(() => {
                this.handleIframeResize(id, iframe);
            });
        });
        observer.observe(iframe);
        this.observers.set(id, observer);
        // Setup message handler
        const handler = (event) => {
            if (event.source === iframe.contentWindow) {
                this.handleIframeMessage(id, event);
            }
        };
        window.addEventListener('message', handler);
        this.messageHandlers.set(id, handler);
    }
    /**
     * Handle iframe resize efficiently
     */
    handleIframeResize(id, iframe) {
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            const rect = iframe.getBoundingClientRect();
            // Emit custom event for view updates
            window.dispatchEvent(new CustomEvent('iframe-resize', {
                detail: { id, rect }
            }));
        });
    }
    /**
     * Handle iframe messages
     */
    handleIframeMessage(id, event) {
        // Validate origin for security
        const allowedOrigins = ['*']; // Configure based on needs
        if (allowedOrigins.includes('*') || allowedOrigins.includes(event.origin)) {
            window.dispatchEvent(new CustomEvent('iframe-message', {
                detail: { id, data: event.data, origin: event.origin }
            }));
        }
    }
    /**
     * Unregister iframe
     */
    unregisterIframe(id) {
        const iframe = this.iframes.get(id);
        if (iframe) {
            const observer = this.observers.get(id);
            if (observer) {
                observer.disconnect();
                this.observers.delete(id);
            }
            const handler = this.messageHandlers.get(id);
            if (handler) {
                window.removeEventListener('message', handler);
                this.messageHandlers.delete(id);
            }
            this.iframes.delete(id);
        }
    }
    /**
     * Get iframe by ID
     */
    getIframe(id) {
        return this.iframes.get(id);
    }
    /**
     * Send message to iframe
     */
    postMessage(id, message, targetOrigin = '*') {
        const iframe = this.iframes.get(id);
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(message, targetOrigin);
        }
    }
}
/**
 * Singleton iframe manager
 */
let iframeManagerInstance = null;
export function getIframeManager() {
    if (!iframeManagerInstance) {
        iframeManagerInstance = new IframeManager();
    }
    return iframeManagerInstance;
}
/**
 * View renderer with performance optimizations
 */
export class OptimizedViewRenderer {
    renderQueue = [];
    isRendering = false;
    frameId = null;
    /**
     * Queue a render operation
     */
    queueRender(callback) {
        this.renderQueue.push(callback);
        this.scheduleRender();
    }
    /**
     * Schedule next render frame
     */
    scheduleRender() {
        if (this.isRendering || this.frameId !== null) {
            return;
        }
        this.frameId = requestAnimationFrame(() => {
            this.frameId = null;
            this.flushRenderQueue();
        });
    }
    /**
     * Flush render queue
     */
    flushRenderQueue() {
        if (this.renderQueue.length === 0) {
            this.isRendering = false;
            return;
        }
        this.isRendering = true;
        const batch = this.renderQueue.splice(0, 10); // Process up to 10 at a time
        batch.forEach(callback => {
            try {
                callback();
            }
            catch (error) {
                console.error('[OptimizedViewRenderer] Render error:', error);
            }
        });
        // Schedule next batch if queue not empty
        if (this.renderQueue.length > 0) {
            this.scheduleRender();
        }
        else {
            this.isRendering = false;
        }
    }
    /**
     * Cancel pending renders
     */
    cancel() {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.renderQueue = [];
        this.isRendering = false;
    }
}
/**
 * Singleton renderer
 */
let rendererInstance = null;
export function getViewRenderer() {
    if (!rendererInstance) {
        rendererInstance = new OptimizedViewRenderer();
    }
    return rendererInstance;
}
/**
 * Performance monitor
 */
export class PerformanceMonitor {
    metrics = new Map();
    /**
     * Start timing
     */
    start(label) {
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            const times = this.metrics.get(label) || [];
            times.push(duration);
            if (times.length > 100) {
                times.shift(); // Keep last 100 measurements
            }
            this.metrics.set(label, times);
        };
    }
    /**
     * Get average time for label
     */
    getAverage(label) {
        const times = this.metrics.get(label) || [];
        if (times.length === 0)
            return 0;
        return times.reduce((a, b) => a + b, 0) / times.length;
    }
    /**
     * Get all metrics
     */
    getMetrics() {
        const result = {};
        this.metrics.forEach((times, label) => {
            result[label] = {
                avg: this.getAverage(label),
                count: times.length,
            };
        });
        return result;
    }
}
/**
 * Singleton performance monitor
 */
let monitorInstance = null;
export function getPerformanceMonitor() {
    if (!monitorInstance) {
        monitorInstance = new PerformanceMonitor();
    }
    return monitorInstance;
}
