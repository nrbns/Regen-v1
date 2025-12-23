/**
 * Rate Limiter Middleware
 *
 * Prevents abuse by limiting requests per user/IP
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { redisClient } from '../config/redis.js';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (request: FastifyRequest) => string;
  skip?: (request: FastifyRequest) => boolean;
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, max, keyGenerator = defaultKeyGenerator, skip = () => false } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if skip function returns true
    if (skip(request)) {
      return;
    }

    // Generate rate limit key
    const key = `rate-limit:${keyGenerator(request)}`;

    if (!redisClient || redisClient.status !== 'ready') {
      // If Redis unavailable, allow request (graceful degradation)
      console.warn('[RateLimiter] Redis unavailable, skipping rate limit');
      return;
    }

    try {
      // Get current count
      const count = await redisClient.get(key);
      const currentCount = count ? parseInt(count, 10) : 0;

      if (currentCount >= max) {
        // Rate limit exceeded
        const ttl = await redisClient.ttl(key);

        reply.status(429).send({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(ttl / 1000)} seconds.`,
          retryAfter: Math.ceil(ttl),
        });
        return;
      }

      // Increment counter
      if (currentCount === 0) {
        // First request in window, set with TTL
        await redisClient.setex(key, Math.ceil(windowMs / 1000), '1');
      } else {
        // Increment existing counter
        await redisClient.incr(key);
      }

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', max.toString());
      reply.header('X-RateLimit-Remaining', Math.max(0, max - currentCount - 1).toString());

      const ttl = await redisClient.ttl(key);
      reply.header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
    } catch (error) {
      // On error, allow request (graceful degradation)
      console.error('[RateLimiter] Error:', error);
    }
  };
}

/**
 * Default key generator (uses IP address + user ID if available)
 */
function defaultKeyGenerator(request: FastifyRequest): string {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  const userId = (request as any).user?.id || 'anonymous';
  return `${ip}:${userId}`;
}

/**
 * Rate limiter for START_SEARCH endpoint (5 requests per minute)
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  keyGenerator: request => {
    const userId = (request as any).user?.id || request.ip || 'anonymous';
    return `search:${userId}`;
  },
});

/**
 * Rate limiter for API endpoints (100 requests per minute)
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: request => {
    const userId = (request as any).user?.id || request.ip || 'anonymous';
    return `api:${userId}`;
  },
});

/**
 * Rate limiter for authentication endpoints (5 attempts per 15 minutes)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: request => {
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    return `auth:${ip}`;
  },
});
