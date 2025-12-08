/* eslint-env node */
/**
 * Rate Limiting Middleware
 * Per-IP rate limiting with in-memory storage (fallback to Redis if available)
 */

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  keyGenerator?: (request: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  increment(key: string): Promise<number>;
  reset(key: string): Promise<void>;
}

class MemoryStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    
    // Clean expired entries every minute
    setInterval(() => this.cleanExpired(), 60000);
  }

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry.count;
  }

  async increment(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return 1;
    }

    // Increment existing entry
    entry.count++;
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Try to use Redis if available
let redisClient: any = null;
try {
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = new Redis(redisUrl, {
    retryStrategy: () => null, // Don't retry on connection failure
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
  });

  redisClient.on('error', () => {
    // Silently fail - fallback to memory
    redisClient = null;
  });
} catch {
  // Redis not available
}

class RedisStore implements RateLimitStore {
  private client: any;
  private windowMs: number;
  private keyPrefix: string;

  constructor(client: any, windowMs: number) {
    this.client = client;
    this.windowMs = windowMs;
    this.keyPrefix = 'ratelimit:';
  }

  async get(key: string): Promise<number | null> {
    try {
      const value = await this.client.get(`${this.keyPrefix}${key}`);
      return value ? parseInt(value, 10) : null;
    } catch {
      return null;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const count = await this.client.incr(fullKey);
      
      if (count === 1) {
        // Set expiry on first increment
        await this.client.pexpire(fullKey, this.windowMs);
      }
      
      return count;
    } catch {
      return 1; // Fallback
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.client.del(`${this.keyPrefix}${key}`);
    } catch {
      // Ignore
    }
  }
}

/**
 * Create rate limiter middleware for Fastify
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    keyGenerator = (request) => {
      // Default: use IP address
      return request.ip || request.headers['x-forwarded-for'] || 'unknown';
    },
    skipSuccessfulRequests: _skipSuccessfulRequests = false,
    skipFailedRequests: _skipFailedRequests = false,
  } = options;

  // Use Redis if available, otherwise memory
  const store: RateLimitStore = redisClient
    ? new RedisStore(redisClient, windowMs)
    : new MemoryStore(windowMs);

  return async (request: any, reply: any) => {
    const key = keyGenerator(request);
    const count = await store.increment(key);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', Math.max(0, max - count));
    reply.header('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

    if (count > max) {
      reply.code(429).send({
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000 / 60} minutes.`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
      return;
    }

    // Continue to next handler
  };
}

/**
 * Default rate limiters for different endpoints
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 searches per 15 minutes
});

export const summarizeRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 summaries per hour (more expensive)
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200, // General API rate limit
});


