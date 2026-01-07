/**
 * MVP Telemetry Service
 * Tracks anonymous usage events for analytics and debugging
 * No PII is collected - session IDs are generated locally
 */

export type TelemetryEventType =
  | 'app_startup'
  | 'feature_toggle'
  | 'feature_enabled'
  | 'feature_disabled'
  | 'hibernation_trigger'
  | 'low_ram_detection'
  | 'battery_mode_activate'
  | 'battery_mode_deactivate'
  | 'tab_hibernated'
  | 'tab_resumed'
  | 'sidebar_toggle'
  | 'navigation_action'
  | 'keyboard_shortcut'
  | 'error'
  | 'performance_metric';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
  userAgent?: string;
}

/**
 * MVP Telemetry Service
 * Lightweight telemetry for MVP feature tracking
 */
class MVPTelemetryService {
  private sessionId: string;
  private isEnabled: boolean = true;
  private events: TelemetryEvent[] = [];
  private MAX_EVENTS = 100; // Buffer up to 100 events before sending
  private FLUSH_INTERVAL = 60000; // Flush every 60 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeService();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Initialize the telemetry service
   */
  private initializeService(): void {
    // Check if telemetry is enabled (default: true for privacy-conscious users)
    const stored = localStorage?.getItem('mvp-telemetry-enabled');
    if (stored !== null) {
      this.isEnabled = JSON.parse(stored);
    } else {
      // Default to enabled, but allow users to opt-out
      this.isEnabled = true;
      localStorage?.setItem('mvp-telemetry-enabled', 'true');
    }

    // Start periodic flush
    this.startFlushTimer();

    // Track app startup
    this.track('app_startup', {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    console.log('[Telemetry] Service initialized:', {
      sessionId: this.sessionId,
      enabled: this.isEnabled,
    });
  }

  /**
   * Track a telemetry event
   */
  track(type: TelemetryEventType, data: Record<string, unknown> = {}): void {
    if (!this.isEnabled) return;

    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        ...data,
        userAgent: data.userAgent || navigator.userAgent,
      },
    };

    this.events.push(event);

    // Flush if buffer is full
    if (this.events.length >= this.MAX_EVENTS) {
      this.flush();
    }

    if (import.meta.env.DEV) {
      console.debug('[Telemetry] Event tracked:', { type, data });
    }
  }

  /**
   * Track feature toggle events
   */
  trackFeatureToggle(featureId: string, enabled: boolean): void {
    this.track(enabled ? 'feature_enabled' : 'feature_disabled', {
      featureId,
      enabled,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance_metric', {
      metric,
      value,
      unit,
    });
  }

  /**
   * Track errors
   */
  trackError(error: string, context?: Record<string, unknown>): void {
    this.track('error', {
      error,
      context,
    });
  }

  /**
   * Track hibernation events
   */
  trackHibernation(
    tabId: string,
    action: 'hibernated' | 'resumed',
    context?: Record<string, unknown>
  ): void {
    this.track(action === 'hibernated' ? 'tab_hibernated' : 'tab_resumed', {
      tabId,
      ...context,
    });
  }

  /**
   * Track navigation actions
   */
  trackNavigation(action: 'back' | 'forward' | 'reload', context?: Record<string, unknown>): void {
    this.track('navigation_action', {
      action,
      ...context,
    });
  }

  /**
   * Track keyboard shortcuts
   */
  trackKeyboardShortcut(shortcut: string, action: string): void {
    this.track('keyboard_shortcut', {
      shortcut,
      action,
    });
  }

  /**
   * Flush events to backend (placeholder for actual implementation)
   */
  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // Placeholder: In production, send to analytics backend
      // Example: POST /api/telemetry with { events, sessionId }
      const payload = {
        sessionId: this.sessionId,
        events: eventsToSend,
        timestamp: new Date().toISOString(),
      };

      if (import.meta.env.DEV) {
        console.log('[Telemetry] Would flush events:', payload);
      }

      // In production, implement actual API call:
      // await fetch('/api/telemetry', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
    } catch (error) {
      console.warn('[Telemetry] Flush failed:', error);
      // Re-add events if flush fails (up to a limit)
      if (this.events.length < this.MAX_EVENTS * 2) {
        this.events.unshift(...eventsToSend);
      }
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop periodic flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Manually flush pending events
   */
  async flushNow(): Promise<void> {
    await this.flush();
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage?.setItem('mvp-telemetry-enabled', JSON.stringify(enabled));
    console.log('[Telemetry] Enabled:', enabled);
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabledStatus(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get pending events count
   */
  getPendingEventsCount(): number {
    return this.events.length;
  }

  /**
   * Cleanup on app shutdown
   */
  async cleanup(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }
}

// Singleton instance
let telemetryService: MVPTelemetryService | null = null;

/**
 * Get or create telemetry service instance
 */
export function getTelemetryService(): MVPTelemetryService {
  if (!telemetryService) {
    telemetryService = new MVPTelemetryService();
  }
  return telemetryService;
}

/**
 * Initialize telemetry in AppShell
 */
export function initializeTelemetry(): void {
  const service = getTelemetryService();

  // Track app startup
  service.track('app_startup', {
    timestamp: new Date().toISOString(),
  });

  // Listen for feature toggle events
  window.addEventListener('mvp-feature-toggled', ((e: CustomEvent) => {
    const { featureId, enabled } = e.detail;
    service.trackFeatureToggle(featureId, enabled);
  }) as EventListener);

  // Listen for hibernation events
  window.addEventListener('tab-hibernated', ((e: CustomEvent) => {
    const { tabId } = e.detail;
    service.trackHibernation(tabId, 'hibernated');
  }) as EventListener);

  window.addEventListener('tab-resumed', ((e: CustomEvent) => {
    const { tabId } = e.detail;
    service.trackHibernation(tabId, 'resumed');
  }) as EventListener);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    service.cleanup();
  });

  console.log('[Telemetry] Initialized and listening for events');
}

export default getTelemetryService();
