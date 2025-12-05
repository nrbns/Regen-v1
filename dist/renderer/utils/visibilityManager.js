/**
 * Visibility Manager - Pause heavy tasks when tab is hidden
 * Reduces CPU/battery drain when app is in background
 */
class VisibilityManager {
    callbacks = new Set();
    isVisible = !document.hidden;
    constructor() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }
    }
    handleVisibilityChange = () => {
        const wasVisible = this.isVisible;
        this.isVisible = !document.hidden;
        if (wasVisible && !this.isVisible) {
            // Tab became hidden - pause heavy tasks
            this.callbacks.forEach(callback => {
                try {
                    callback();
                }
                catch (error) {
                    console.error('[VisibilityManager] Error in callback:', error);
                }
            });
        }
    };
    /**
     * Register a callback to be called when tab becomes hidden
     */
    onHidden(callback) {
        this.callbacks.add(callback);
        return () => {
            this.callbacks.delete(callback);
        };
    }
    /**
     * Check if tab is currently visible
     */
    isTabVisible() {
        return this.isVisible;
    }
    /**
     * Cleanup
     */
    destroy() {
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }
        this.callbacks.clear();
    }
}
// Singleton instance
export const visibilityManager = new VisibilityManager();
