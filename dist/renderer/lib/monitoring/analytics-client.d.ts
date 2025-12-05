/**
 * Renderer helper for privacy-friendly analytics.
 */
export declare function applyAnalyticsOptIn(optIn: boolean): Promise<void>;
export declare function syncAnalyticsOptIn(): Promise<void>;
export declare function trackAnalyticsEvent(type: string, payload?: Record<string, unknown>): void;
export declare function trackPageView(path: string): void;
