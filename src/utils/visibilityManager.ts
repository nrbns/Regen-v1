/**
 * Visibility Manager - Pause heavy tasks when tab is hidden
 * Reduces CPU/battery drain when app is in background
 */

type VisibilityCallback = () => void;

class VisibilityManager {
  private callbacks: Set<VisibilityCallback> = new Set();
  private isVisible: boolean = !document.hidden;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    const wasVisible = this.isVisible;
    this.isVisible = !document.hidden;

    if (wasVisible && !this.isVisible) {
      // Tab became hidden - pause heavy tasks
      this.callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('[VisibilityManager] Error in callback:', error);
        }
      });
    }
  };

  /**
   * Register a callback to be called when tab becomes hidden
   */
  onHidden(callback: VisibilityCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Check if tab is currently visible
   */
  isTabVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.callbacks.clear();
  }
}

// Singleton instance
export const visibilityManager = new VisibilityManager();
