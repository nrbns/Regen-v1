/**
 * IPC Rate Limiting
 * Prevents abuse of high-frequency IPC calls
 */

import { IpcMainInvokeEvent } from 'electron';
import { createLogger } from './utils/logger';

const log = createLogger('ipc-rate-limit');

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default rate limits per channel
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'tabs:list': { maxRequests: 10, windowMs: 1000 }, // 10 per second
  'tabs:updated': { maxRequests: 20, windowMs: 1000 }, // 20 per second
  'system:getStatus': { maxRequests: 5, windowMs: 1000 }, // 5 per second
  'storage:getSetting': { maxRequests: 50, windowMs: 1000 }, // 50 per second
  'storage:setSetting': { maxRequests: 20, windowMs: 1000 }, // 20 per second
};

// Track request counts per channel per sender
const requestCounts = new Map<string, Map<number, number[]>>();

/**
 * Get rate limit config for a channel
 */
function getRateLimit(channel: string): RateLimitConfig | null {
  return DEFAULT_RATE_LIMITS[channel] || null;
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  event: IpcMainInvokeEvent,
  channel: string
): { allowed: boolean; retryAfter?: number } {
  const config = getRateLimit(channel);
  if (!config) {
    // No rate limit configured for this channel
    return { allowed: true };
  }

  const senderId = event.sender.id;
  const now = Date.now();

  // Get or create request history for this sender+channel
  const key = `${channel}:${senderId}`;
  if (!requestCounts.has(key)) {
    requestCounts.set(key, new Map());
  }

  const senderMap = requestCounts.get(key)!;
  if (!senderMap.has(senderId)) {
    senderMap.set(senderId, []);
  }

  const timestamps = senderMap.get(senderId)!;

  // Remove old timestamps outside the window
  const cutoff = now - config.windowMs;
  const recent = timestamps.filter(ts => ts > cutoff);

  // Check if limit exceeded
  if (recent.length >= config.maxRequests) {
    const oldest = recent[0];
    const retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
    log.warn('Rate limit exceeded', {
      channel,
      senderId,
      count: recent.length,
      max: config.maxRequests,
      retryAfter,
    });
    return { allowed: false, retryAfter };
  }

  // Add current request
  recent.push(now);
  senderMap.set(senderId, recent);

  return { allowed: true };
}

/**
 * Cleanup old rate limit data (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const maxAge = 60000; // 1 minute

  for (const [key, senderMap] of requestCounts.entries()) {
    for (const [senderId, timestamps] of senderMap.entries()) {
      const cutoff = now - maxAge;
      const recent = timestamps.filter(ts => ts > cutoff);
      if (recent.length === 0) {
        senderMap.delete(senderId);
      } else {
        senderMap.set(senderId, recent);
      }
    }

    if (senderMap.size === 0) {
      requestCounts.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
