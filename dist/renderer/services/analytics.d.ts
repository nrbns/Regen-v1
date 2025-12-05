/**
 * Analytics Service - Tier 2
 * Event logging for user behavior tracking
 */
export type EventName = 'app_open' | 'app_close' | 'tab_created' | 'tab_closed' | 'tab_switched' | 'bookmark_added' | 'bookmark_removed' | 'workspace_saved' | 'workspace_restored' | 'workspace_deleted' | 'summary_requested' | 'agent_task_started' | 'agent_task_completed' | 'agent_task_failed' | 'settings_changed' | 'mode_switched' | 'error_shown' | 'feedback_submitted' | 'command_bar_opened' | 'command_bar_executed' | 'plugin_registered' | 'plugin_enabled' | 'plugin_disabled' | 'auth_session_restored' | 'auth_magic_link_requested' | 'auth_device_code_requested' | 'auth_magic_link_verified' | 'auth_device_code_verified' | 'auth_anonymous_session_created' | 'auth_signed_out' | 'sync_enabled' | 'sync_disabled' | 'sync_pushed' | 'sync_conflicts' | 'sync_completed' | 'sync_failed';
export type AnalyticsEvent = {
    name: EventName;
    timestamp: number;
    data?: Record<string, unknown>;
};
declare class AnalyticsService {
    private events;
    private maxEvents;
    private enabled;
    /**
     * Track an event
     */
    track(name: EventName, data?: Record<string, unknown>): void;
    /**
     * Get all events
     */
    getEvents(): AnalyticsEvent[];
    /**
     * Get events by name
     */
    getEventsByName(name: EventName): AnalyticsEvent[];
    /**
     * Clear all events
     */
    clear(): void;
    /**
     * Enable/disable analytics
     */
    setEnabled(enabled: boolean): void;
    /**
     * Send events to backend (for future implementation)
     */
    private sendToBackend;
    /**
     * Flush all events to backend
     */
    flush(): Promise<void>;
}
export declare const analytics: AnalyticsService;
export declare function track(name: EventName, data?: Record<string, unknown>): void;
export {};
