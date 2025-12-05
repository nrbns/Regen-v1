/**
 * Analytics Service - Tier 2
 * Event logging for user behavior tracking
 */
class AnalyticsService {
    events = [];
    maxEvents = 1000;
    enabled = true;
    /**
     * Track an event
     */
    track(name, data) {
        if (!this.enabled)
            return;
        const event = {
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
    getEvents() {
        return [...this.events];
    }
    /**
     * Get events by name
     */
    getEventsByName(name) {
        return this.events.filter(e => e.name === name);
    }
    /**
     * Clear all events
     */
    clear() {
        this.events = [];
    }
    /**
     * Enable/disable analytics
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Send events to backend (for future implementation)
     */
    async sendToBackend(_event) {
        try {
            // In production, POST to /api/analytics
            // await fetch('/api/analytics', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(event),
            // });
        }
        catch (error) {
            console.error('[Analytics] Failed to send event to backend', error);
        }
    }
    /**
     * Flush all events to backend
     */
    async flush() {
        if (this.events.length === 0)
            return;
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
export function track(name, data) {
    analytics.track(name, data);
}
