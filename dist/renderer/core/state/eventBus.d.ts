/**
 * Global Event Bus - Tier 2
 * Centralized event system for mode-shifts and state changes
 */
type EventCallback = (...args: unknown[]) => void;
declare class EventBus {
    private events;
    /**
     * Subscribe to an event
     */
    on(event: string, callback: EventCallback): () => void;
    /**
     * Unsubscribe from an event
     */
    off(event: string, callback: EventCallback): void;
    /**
     * Emit an event
     */
    emit(event: string, ...args: unknown[]): void;
    /**
     * Subscribe to an event once
     */
    once(event: string, callback: EventCallback): void;
    /**
     * Clear all listeners for an event
     */
    clear(event: string): void;
    /**
     * Clear all events
     */
    clearAll(): void;
    /**
     * Get listener count for an event
     */
    listenerCount(event: string): number;
}
export declare const eventBus: EventBus;
export declare const EVENTS: {
    readonly MODE_CHANGED: "mode:changed";
    readonly TAB_OPENED: "tab:opened";
    readonly TAB_CLOSED: "tab:closed";
    readonly TAB_ACTIVATED: "tab:activated";
    readonly SESSION_SAVED: "session:saved";
    readonly SESSION_RESTORED: "session:restored";
    readonly CACHE_CLEARED: "cache:cleared";
    readonly ERROR_OCCURRED: "error:occurred";
};
export {};
