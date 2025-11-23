/**
 * Crash Reporting - Tier 3 Pillar 3
 * Capture and report errors with context
 */

import { log } from '../utils/logger';
import { useAppStore } from '../state/appStore';
import { useTabsStore } from '../state/tabsStore';
import { authService } from '../services/auth';

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

class CrashReporter {
  private reports: CrashReport[] = [];
  private enabled = true;
  private maxReports = 50;

  /**
   * Initialize crash reporting
   */
  initialize(): void {
    // Check user consent
    const consent = localStorage.getItem('omnibrowser_crash_reporting_consent');
    this.enabled = consent === 'true';

    // Global error handler
    window.addEventListener('error', event => {
      this.captureError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', event => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {}
      );
    });

    log.info('[CrashReporter] Initialized');
  }

  /**
   * Capture an error
   */
  captureError(error: Error, additionalContext?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    const report: CrashReport = {
      id: `crash-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context: {
        route: window.location.pathname,
        mode: useAppStore.getState().mode,
        tabCount: useTabsStore.getState().tabs.length,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...additionalContext,
      },
      user: authService.getCurrentUser() ? { id: authService.getCurrentUser()!.id } : undefined,
      environment: {
        platform: navigator.platform,
        version: (window as any).__OMNIBROWSER_VERSION__ || 'unknown',
      },
    };

    this.reports.push(report);

    // Keep only recent reports
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }

    // Log locally
    log.error('[CrashReporter] Error captured:', report);

    // Send to backend (async, don't block)
    this.sendReport(report).catch(err => {
      log.error('[CrashReporter] Failed to send report:', err);
    });
  }

  /**
   * Send report to backend
   */
  private async sendReport(report: CrashReport): Promise<void> {
    try {
      // TODO: Call backend API
      // POST /api/crash
      // For now, just log
      log.info('[CrashReporter] Would send report:', report.id);

      // Store locally for manual review
      const stored = localStorage.getItem('omnibrowser_crash_reports');
      const reports = stored ? JSON.parse(stored) : [];
      reports.push(report);
      localStorage.setItem('omnibrowser_crash_reports', JSON.stringify(reports.slice(-10))); // Keep last 10
    } catch (error) {
      log.error('[CrashReporter] Failed to send report:', error);
    }
  }

  /**
   * Check if crash reporting is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable/disable crash reporting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('omnibrowser_crash_reporting_consent', String(enabled));
    log.info('[CrashReporter]', enabled ? 'Enabled' : 'Disabled');
  }

  /**
   * Get stored reports
   */
  getStoredReports(): CrashReport[] {
    try {
      const stored = localStorage.getItem('omnibrowser_crash_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored reports
   */
  clearStoredReports(): void {
    localStorage.removeItem('omnibrowser_crash_reports');
    this.reports = [];
  }
}

// Singleton instance
export const crashReporter = new CrashReporter();
