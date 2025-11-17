/**
 * Privacy-Safe Telemetry Service
 * Opt-in only, no PII, anonymized data
 * 
 * Captures:
 * - Install events
 * - Crash reports (anonymized)
 * - Performance metrics (cold start, tab switch)
 * - Feature usage (anonymized)
 */

import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { createLogger } from './utils/logger';
import { getCurrentSettings } from './storage';
import { enableCrashReporting, disableCrashReporting, captureException } from './observability/sentry';

const logger = createLogger('telemetry');

// Telemetry endpoint (can be configured via env)
const TELEMETRY_ENDPOINT = process.env.TELEMETRY_ENDPOINT || 'https://telemetry.omnibrowser.dev/api/v1/events';
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED === 'true';

interface TelemetryEvent {
  id: string;
  type: 'install' | 'crash' | 'perf' | 'feature_usage';
  timestamp: number;
  sessionId: string;
  appVersion: string;
  platform: string;
  arch: string;
  data: Record<string, unknown>;
}

interface PerfMetricHistory {
  samples: number;
  sum: number;
  values: number[]; // rolling window for percentile calc
  unit: 'ms' | 'MB' | '%';
}

class TelemetryService {
  private sessionId: string;
  private enabled: boolean = false;
  private optInPreference: boolean = false;
  private queue: TelemetryEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private installTracked: boolean = false;
  private crashCount = 0;
  private lastCrashAt: number | null = null;
  private perfHistory = new Map<string, PerfMetricHistory>();

  constructor() {
    this.sessionId = randomUUID();
    this.loadOptInStatus();
  }

  private async loadOptInStatus() {
    try {
      const current = getCurrentSettings();
      const optIn = Boolean(current?.diagnostics?.telemetryOptIn);
      await this.setOptIn(optIn);
    } catch (error) {
      logger.warn('Failed to load telemetry opt-in status', { error: error instanceof Error ? error.message : String(error) });
      this.enabled = false;
    }
  }

  async setOptIn(optIn: boolean) {
    this.optInPreference = optIn;
    this.enabled = optIn && TELEMETRY_ENABLED;
    
    if (this.enabled) {
      enableCrashReporting();
      this.startFlushInterval();
      if (!this.installTracked) {
        this.trackInstall();
      }
    } else {
      await disableCrashReporting();
      this.stopFlushInterval();
      this.queue = []; // Clear queue when opting out
    }
  }

  private trackInstall() {
    if (this.installTracked || !this.enabled) return;
    
    const installId = randomUUID();
    this.installTracked = true;
    
    this.track('install', {
      installId,
      firstRun: true,
    });
  }

  trackCrash(error: Error, context?: Record<string, unknown>) {
    this.crashCount += 1;
    this.lastCrashAt = Date.now();

    // Always capture locally for SLOs; only send remotely when enabled
    if (this.enabled) {
      // Anonymize error - remove stack traces, file paths, PII
      const anonymizedError = {
        name: error.name,
        message: error.message.replace(/\/Users\/[^/]+/g, '/Users/***').replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\***'),
      };

      this.track('crash', {
        error: anonymizedError,
        context: context && typeof context === 'object' ? this.anonymizeContext(context as Record<string, unknown>) : {},
      });

      captureException(error, context);
    }
  }

  trackPerformance(metric: string, value: number, unit: 'ms' | 'MB' | '%' = 'ms') {
    const history = this.perfHistory.get(metric) || {
      samples: 0,
      sum: 0,
      values: [],
      unit,
    };
    history.samples += 1;
    history.sum += value;
    history.values.push(value);
    if (history.values.length > 100) {
      history.values.shift();
    }
    history.unit = unit;
    this.perfHistory.set(metric, history);

    if (this.enabled) {
      this.track('perf', {
        metric,
        value,
        unit,
      });
    }
  }

  trackFeatureUsage(feature: string, action?: string) {
    if (!this.enabled) return;

    this.track('feature_usage', {
      feature,
      action: action || 'used',
    });
  }

  private track(type: TelemetryEvent['type'], data: Record<string, unknown>) {
    if (!this.enabled) return;

    const event: TelemetryEvent = {
      id: randomUUID(),
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      data: this.anonymizeContext(data as Record<string, unknown>),
    };

    this.queue.push(event);

    // Flush immediately for critical events
    if (type === 'crash' || type === 'install') {
      this.flush().catch((err) => {
        logger.warn('Failed to flush telemetry immediately', err);
      });
    }
  }

  private anonymizeContext(context: Record<string, unknown>): Record<string, unknown> {
    if (!context || typeof context !== 'object') {
      return {};
    }
    
    const anonymized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(context)) {
      // Remove PII patterns
      if (typeof value === 'string') {
        // Remove email addresses
        if (value.includes('@')) {
          anonymized[key] = '[email]';
          continue;
        }
        // Remove URLs with personal info
        if (value.startsWith('http')) {
          try {
            const url = new URL(value);
            // Keep domain but remove path/query
            anonymized[key] = `${url.protocol}//${url.hostname}`;
            continue;
          } catch {
            anonymized[key] = '[url]';
            continue;
          }
        }
        // Remove file paths
        if (value.includes('/') || value.includes('\\')) {
          anonymized[key] = '[path]';
          continue;
        }
      }
      
      anonymized[key] = value;
    }
    
    return anonymized;
  }

  private startFlushInterval() {
    if (this.flushInterval) return;
    
    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        logger.warn('Failed to flush telemetry queue', err);
      });
    }, 30000);
  }

  private stopFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private async flush() {
    if (this.queue.length === 0 || !this.enabled) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `OmniBrowser/${app.getVersion()}`,
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        logger.warn(`Telemetry endpoint returned ${response.status}`);
        // Re-queue events on failure (up to limit)
        if (events.length < 100) {
          this.queue.unshift(...events);
        }
      }
    } catch (error) {
      logger.warn('Failed to send telemetry', { error: error instanceof Error ? error.message : String(error) });
      // Re-queue events on failure (up to limit)
      if (events.length < 100) {
        this.queue.unshift(...events);
      }
    }
  }

  async shutdown() {
    this.stopFlushInterval();
    await this.flush();
  }

  getStatus() {
    return {
      optIn: this.optInPreference,
      enabled: this.enabled,
    };
  }

  getSummary() {
    const perfMetrics = Array.from(this.perfHistory.entries()).map(([metric, history]) => {
      const avg = history.samples > 0 ? history.sum / history.samples : 0;
      const sorted = [...history.values].sort((a, b) => a - b);
      const p95Index = Math.max(0, Math.floor(0.95 * (sorted.length - 1)));
      const p95 = sorted.length ? sorted[p95Index] : 0;
      return {
        metric,
        samples: history.samples,
        avg,
        p95,
        last: history.values[history.values.length - 1] ?? 0,
        unit: history.unit,
      };
    });

    return {
      optIn: this.optInPreference,
      enabled: this.enabled,
      crashCount: this.crashCount,
      lastCrashAt: this.lastCrashAt,
      uptimeSeconds: Math.floor(process.uptime()),
      perfMetrics,
    };
  }
}

let telemetryService: TelemetryService | null = null;

export function getTelemetryService(): TelemetryService {
  if (!telemetryService) {
    telemetryService = new TelemetryService();
  }
  return telemetryService;
}

export function registerTelemetryIpc() {
  const service = getTelemetryService();

  registerHandler('telemetry:setOptIn', z.object({ optIn: z.boolean() }), async (_event, request) => {
    await service.setOptIn(request.optIn);
    return { success: true };
  });

  registerHandler('telemetry:getStatus', z.object({}), async () => {
    return service.getStatus();
  });

  registerHandler('telemetry:getSummary', z.object({}), async () => {
    return service.getSummary();
  });

  registerHandler('telemetry:trackPerf', z.object({ metric: z.string(), value: z.number(), unit: z.enum(['ms', 'MB', '%']).optional() }), async (_event, request) => {
    service.trackPerformance(request.metric, request.value, request.unit);
    return { success: true };
  });

  registerHandler('telemetry:trackFeature', z.object({ feature: z.string(), action: z.string().optional() }), async (_event, request) => {
    service.trackFeatureUsage(request.feature, request.action);
    return { success: true };
  });

  // Track app crashes
  process.on('uncaughtException', (error) => {
    service.trackCrash(error, { source: 'uncaughtException' });
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    service.trackCrash(error, { source: 'unhandledRejection' });
  });
}

