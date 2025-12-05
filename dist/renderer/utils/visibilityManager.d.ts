/**
 * Visibility Manager - Pause heavy tasks when tab is hidden
 * Reduces CPU/battery drain when app is in background
 */
type VisibilityCallback = () => void;
declare class VisibilityManager {
    private callbacks;
    private isVisible;
    constructor();
    private handleVisibilityChange;
    /**
     * Register a callback to be called when tab becomes hidden
     */
    onHidden(callback: VisibilityCallback): () => void;
    /**
     * Check if tab is currently visible
     */
    isTabVisible(): boolean;
    /**
     * Cleanup
     */
    destroy(): void;
}
export declare const visibilityManager: VisibilityManager;
export {};
