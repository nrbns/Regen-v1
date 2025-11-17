/**
 * Privacy-Friendly Analytics Service
 * Sends anonymous, opt-in events to a configurable endpoint (Matomo/Fathom/etc).
 */

// @ts-nocheck

import { app } from 'electron';
import { randomUUID, createHash } from 'node:crypto';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { createLogger } from './utils/logger';
import { getCurrentSettings } from './storage';

const logger = createLogger('analytics');

const ANALYTICS_ENDPOINT = process.env.ANALYTICS_ENDPOINT || '';
const ANALYTICS_SITE_ID = process.env.ANALYTICS_SITE_ID || process.env.ANALYTICS_SITE_TOKEN || '';
const ANALYTICS_PUBLIC_KEY = process.env.ANALYTICS_PUBLIC_KEY || process.env.ANALYTICS_API_KEY || '';

interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

class AnalyticsService {
  private enabled = false;
  private optIn = false;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId = randomUUID();

  constructor() {
    this.loadOptIn();
  }

  private async loadOptIn() {
    try {
      const current = getCurrentSettings();
      const optIn = Boolean(current?.diagnostics?.analyticsOptIn);
      await this.setOptIn(optIn);
    } catch (error) {
      logger.warn('Failed to load analytics opt-in status', { error });
    }
  }

  async setOptIn(optIn: boolean) {
    this.optIn = optIn;
    this.enabled = Boolean(ANALYTICS_ENDPOINT) && optIn;

    if (this.enabled) {
      this.startFlushTimer();
      this.track('app_start', {
        version: app.getVersion(),
        platform: process.platform,
        channel: process.env.OB_CHANNEL || 'desktop',
      });
    } else {
      this.stopFlushTimer();
      this.queue = [];
    }
  }

  getStatus() {
    return {
      optIn: this.optIn,
      enabled: this.enabled,
    };
  }

  track(type: string, payload?: Record<string, unknown>) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      id: randomUUID(),
      type: type.slice(0, 64),
      timestamp: Date.now(),
      payload: payload ? this.scrubPayload(payload) : undefined,
    };

    this.queue.push(event);

    if (this.queue.length >= 20) {
      this.flush().catch((error) => {
        logger.warn('Analytics flush failed', { error });
      });
    }
  }

  private scrubPayload(payload: Record<string, unknown>) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        if (value.startsWith('http')) {
          try {
            const url = new URL(value);
            sanitized[key] = `${url.protocol}//${url.hostname}`;
            continue;
          } catch {
            sanitized[key] = '[url]';
            continue;
          }
        }
        if (value.includes('/') || value.includes('\\')) {
          sanitized[key] = '[path]';
          continue;
        }
        if (value.includes('@')) {
          sanitized[key] = '[email]';
          continue;
        }
      }
      sanitized[key] = value;
    }
    sanitized.sessionId = this.hashSession(this.sessionId);
    return sanitized;
  }

  private hashSession(id: string) {
    return createHash('sha256').update(id).digest('hex').slice(0, 16);
  }

  private startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => logger.warn('Analytics flush error', { error }));
    }, 15000);
  }

  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flush() {
    if (!this.enabled || this.queue.length === 0) return;
    if (!ANALYTICS_ENDPOINT) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ANALYTICS_PUBLIC_KEY ? { Authorization: `Bearer ${ANALYTICS_PUBLIC_KEY}` } : {}),
        },
        body: JSON.stringify({
          siteId: ANALYTICS_SITE_ID || 'omnibrowser',
          events,
        }),
      });
    } catch (error) {
      logger.warn('Failed to send analytics events', { error });
      this.queue.unshift(...events.slice(0, 50));
    }
  }
}

let analyticsService: AnalyticsService | null = null;

function getAnalyticsService() {
  if (!analyticsService) {
    analyticsService = new AnalyticsService();
  }
  return analyticsService;
}

export function registerAnalyticsIpc() {
  const service = getAnalyticsService();

  registerHandler('analytics:setOptIn', z.object({ optIn: z.boolean() }), async (_event, request) => {
    await service.setOptIn(request.optIn);
    return { success: true };
  });

  registerHandler('analytics:getStatus', z.object({}), async () => {
    return service.getStatus();
  });

  registerHandler(
    'analytics:track',
    z.object({
      type: z.string().min(1).max(64),
      payload: z.record(z.any()).optional(),
    }),
    async (_event, request) => {
      service.track(request.type, request.payload);
      return { success: true };
    }
  );
}


