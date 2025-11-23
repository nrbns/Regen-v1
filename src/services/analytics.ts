/**
 * Analytics Service - Tier 2
 * Event logging for user behavior tracking
 */

export type EventName =
  | 'app_open'
  | 'app_close'
  | 'tab_created'
  | 'tab_closed'
  | 'tab_switched'
  | 'bookmark_added'
  | 'bookmark_removed'
  | 'workspace_saved'
  | 'workspace_restored'
  | 'workspace_deleted'
  | 'summary_requested'
  | 'agent_task_started'
  | 'agent_task_completed'
  | 'agent_task_failed'
  | 'settings_changed'
  | 'mode_switched'
  | 'error_shown'
  | 'feedback_submitted'
  | 'command_bar_opened'
  | 'command_bar_executed'
  | 'plugin_registered'
  | 'plugin_enabled'
  | 'plugin_disabled'
  | 'auth_session_restored'
  | 'auth_magic_link_requested'
  | 'auth_device_code_requested'
  | 'auth_magic_link_verified'
  | 'auth_device_code_verified'
  | 'auth_anonymous_session_created'
  | 'auth_signed_out'
  | 'sync_enabled'
  | 'sync_disabled'
  | 'sync_pushed'
  | 'sync_conflicts'
  | 'sync_completed'
  | 'sync_failed';

export type AnalyticsEvent = {
  name: EventName;
  timestamp: number;
  data?: Record<string, unknown>;
};

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 1000;
  private enabled = true;

  /**
   * Track an event
   */
  track(name: EventName, data?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);

    // Trim if over limit
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[ANALYTICS]', event);
    }

    // In production, could send to backend
    // this.sendToBackend(event).catch(console.error);
  }

  /**
   * Get all events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events by name
   */
  getEventsByName(name: EventName): AnalyticsEvent[] {
    return this.events.filter(e => e.name === name);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Send events to backend (for future implementation)
   */
  private async sendToBackend(_event: AnalyticsEvent): Promise<void> {
    try {
      // In production, POST to /api/analytics
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });
    } catch (error) {
      console.error('[Analytics] Failed to send event to backend', error);
    }
  }

  /**
   * Flush all events to backend
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const _eventsToSend = [...this.events];
    this.events = [];

    // In production, batch send
    // await fetch('/api/analytics/batch', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ events: eventsToSend }),
    // });
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// Convenience function
export function track(name: EventName, data?: Record<string, unknown>): void {
  analytics.track(name, data);
}
