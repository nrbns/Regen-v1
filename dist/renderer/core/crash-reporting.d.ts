/**
 * Crash Reporting - Tier 3 Pillar 3
 * Capture and report errors with context
 */
export type CrashReport = {
    id: string;
    error: {
        message: string;
        stack?: string;
        name: string;
    };
    context: {
        route?: string;
        mode?: string;
        tabCount?: number;
        timestamp: number;
        userAgent: string;
        url?: string;
    };
    user?: {
        id: string;
    };
    environment: {
        platform: string;
        version?: string;
    };
};
declare class CrashReporter {
    private reports;
    private enabled;
    private maxReports;
    /**
     * Initialize crash reporting
     */
    initialize(): void;
    /**
     * Capture an error
     */
    captureError(error: Error, additionalContext?: Record<string, unknown>): void;
    /**
     * Send report to backend
     */
    private sendReport;
    /**
     * Check if crash reporting is enabled
     */
    isEnabled(): boolean;
    /**
     * Enable/disable crash reporting
     */
    setEnabled(enabled: boolean): void;
    /**
     * Get stored reports
     */
    getStoredReports(): CrashReport[];
    /**
     * Clear stored reports
     */
    clearStoredReports(): void;
}
export declare const crashReporter: CrashReporter;
export {};
