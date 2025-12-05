/**
 * Tab Fetch Utility
 * Prevents stale async responses from overwriting tab state
 * Uses AbortController and per-tab request tokens
 */
/**
 * Fetch tab content with abort support
 */
export async function fetchTabContent(url, options = {}) {
    const { signal, timeout = 30000, headers = {} } = options;
    // Create timeout controller if needed
    let timeoutId = null;
    let timeoutController = null;
    if (timeout > 0) {
        timeoutController = new AbortController();
        timeoutId = setTimeout(() => {
            timeoutController?.abort();
        }, timeout);
    }
    // Combine signals
    const combinedSignal = signal && timeoutController
        ? (() => {
            const combined = new AbortController();
            signal.addEventListener('abort', () => combined.abort());
            timeoutController.signal.addEventListener('abort', () => combined.abort());
            return combined.signal;
        })()
        : signal || timeoutController?.signal;
    try {
        const response = await fetch(url, {
            signal: combinedSignal,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        if (error.name === 'AbortError') {
            // Silently ignore aborted requests
            throw new Error('Request aborted');
        }
        throw error;
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
/**
 * Create a per-tab fetch manager
 */
export class TabFetchManager {
    abortControllers = new Map();
    requestIds = new Map();
    /**
     * Fetch content for a specific tab
     * Automatically cancels previous requests for the same tab
     */
    async fetchForTab(tabId, url, options = {}) {
        // Cancel previous request for this tab
        const previousController = this.abortControllers.get(tabId);
        if (previousController) {
            previousController.abort();
        }
        // Create new controller
        const controller = new AbortController();
        this.abortControllers.set(tabId, controller);
        // Increment request ID
        const currentReqId = (this.requestIds.get(tabId) || 0) + 1;
        this.requestIds.set(tabId, currentReqId);
        try {
            const data = await fetchTabContent(url, {
                ...options,
                signal: controller.signal,
            });
            // Verify this is still the latest request
            if (this.requestIds.get(tabId) !== currentReqId) {
                throw new Error('Stale request ignored');
            }
            return data;
        }
        catch (error) {
            if (error.message === 'Request aborted' || error.message === 'Stale request ignored') {
                // Silently ignore
                throw error;
            }
            throw error;
        }
    }
    /**
     * Cancel all pending requests for a tab
     */
    cancelTab(tabId) {
        const controller = this.abortControllers.get(tabId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(tabId);
        }
    }
    /**
     * Cancel all pending requests
     */
    cancelAll() {
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();
        this.requestIds.clear();
    }
    /**
     * Clean up (call on unmount)
     */
    destroy() {
        this.cancelAll();
    }
}
// Global instance (can be used per-component or globally)
export const globalTabFetchManager = new TabFetchManager();
